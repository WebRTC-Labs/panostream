
#include "stitching.h"

#include <stdio.h>
#include <string.h>

#include <opencv2/imgproc/imgproc.hpp>  // cvtColor
#include <opencv2/calib3d/calib3d.hpp>  // CV_RANSAC

#include "ppapi/cpp/var.h"
#include "ppapi/cpp/var_array.h"
#include "ppapi/cpp/var_dictionary.h"

namespace {
const int kAllowedNumberOfImages = 2;
std::string print(int i) {
  char buffer[100];
  sprintf(buffer, "%d", i);
  return(std::string(buffer));
}
}

Stitching::Stitching(int num_images)
  :  num_images_(num_images) {
}

bool Stitching::InitialiseOpenCV(int width, int height) {
  if (num_images_ != kAllowedNumberOfImages)
    return false;

  image_size_ = cv::Size(width, height);

  for (int i = 0; i < num_images_; ++i) {
    input_img_rgba_.push_back(new cv::Mat(height, width, CV_8UC4));
    input_img_rgb_.push_back(new cv::Mat(height, width, CV_8UC3));
    input_img_.push_back(new cv::Mat(height, width, CV_8UC1));
  }

  // Not all combinations of Feature Detector - Extractor - Matcher would work,
  // see http://stackoverflow.com/questions/14808429/classification-of-detectors-extractors-and-matchers/14912160
  // resumed here:
  // (FAST, SURF) / SURF  / FlannBased  <-- in "flann" OpenCV module.
  // (FAST, SIFT) / SIFT  / FlannBased
  // (FAST, ORB)  / ORB   / BruteForce  <-- BruteForce in OpenCV legacy module.
  // (FAST, ORB)  / BRIEF / BruteForce
  // (FAST, SURF) / FREAK / BruteForce

  detector_ = cv::FeatureDetector::create("FAST");
  if (!detector_)
    last_error_ += "Creating feature detector failed. ";

  extractor_ = cv::DescriptorExtractor::create("FREAK");
  if (!extractor_)
    last_error_ += "Creating feature descriptor extractor failed. ";

  matcher_ = cv::DescriptorMatcher::create("BruteForce");
  if (!matcher_)
    last_error_ += "Creating feature matcher failed. ";

  descriptors_[0] = new cv::Mat();
  descriptors_[1] = new cv::Mat();

  keypoints_[0].clear();
  keypoints_[1].clear();

  return (detector_ && extractor_ && matcher_);
}

bool Stitching::CalculateHomography() {
  bool ret = true;
  last_error_.clear();

  double t_0 = (double)cv::getTickCount();
  msg_handler_->SendMessage("Starting homography calculation");

  // Extract keypoints from image. This is expensive compared to the other ops.
  detector_->detect(*input_img_[0], keypoints_[0]);
  msg_handler_->SendMessage("Detected keypoints image 0: " +
      print(keypoints_[0].size()));
  detector_->detect(*input_img_[1], keypoints_[1]);
  msg_handler_->SendMessage("Detected keypoints image 1: " +
      print(keypoints_[1].size()));

  // Now let's compute the descriptors.
  extractor_->compute(*input_img_[0], keypoints_[0], *descriptors_[0]);
  extractor_->compute(*input_img_[1], keypoints_[1], *descriptors_[1]);
  msg_handler_->SendMessage("Computed descriptors: " +
      print(descriptors_[0]->rows) + " and " + print(descriptors_[1]->rows));

  // Let's match the descriptors.
  matches_.clear();
  matcher_->match(*descriptors_[0], *descriptors_[1], matches_);
  msg_handler_->SendMessage("Matched descriptors, #matches: " +
    print(matches_.size()));

  // Quick calculation of max and min distances between keypoints
  //double max_dist = -1.0; double min_dist = 1000.0;
  //for( int i = 0; i < descriptors_[0]->rows; i++ ) {
  //  double dist = matches_[i].distance;
  //  if( dist < min_dist ) min_dist = dist;
  //  if( dist > max_dist ) max_dist = dist;
  //}
  //msg_handler_->SendMessage("Calculated min-max descriptor distance, min=" +
  //  print(min_dist) + " max=" + print(max_dist) );

  // Use only "good" matches (i.e. whose distance is less than 3*min_dist )
  //cv::vector<cv::DMatch> new_good_matches;
  //for( int i = 0; i < descriptors_[0]->rows; i++ ) {
  //  if( matches_[i].distance < 10*min_dist ) {
  //    new_good_matches.push_back(matches_[i]);
  //  }
  //}
  //if (new_good_matches.size() > 10) good_matches_ = new_good_matches;
  //msg_handler_->SendMessage("Filtered descriptor pairs, matches: " +
  //  print(good_matches_.size()));
  good_matches_ = matches_;

  // Redistribute feature points according to selected matches.
  std::vector<cv::Point2f> obj;
  std::vector<cv::Point2f> scene;
  for( unsigned int i = 0; i < good_matches_.size(); i++ ) {
    obj.push_back(keypoints_[0][good_matches_[i].queryIdx].pt);
    scene.push_back(keypoints_[1][good_matches_[i].trainIdx].pt);
  }

  // Find the Homography Matrix, if we have enough points.
  if (good_matches_.size() > 10) {
    homography_ = findHomography(obj, scene, CV_RANSAC);

    if (cv::getTickFrequency() > 1.0) {
      double t = ((double)cv::getTickCount() - t_0)/cv::getTickFrequency();
      msg_handler_->SendMessage("Homography calculated in: " +
          print(t*1000000) + "ns");
    }
    msg_handler_->SendMessage("H=[[" + print(homography_.at<double>(0,0)) +" "+ print(homography_.at<double>(0,1)) +" "+ print(homography_.at<double>(0,2)) + ']');
    msg_handler_->SendMessage("   [" + print(homography_.at<double>(1,0)) +" "+ print(homography_.at<double>(1,1)) +" "+ print(homography_.at<double>(1,2)) + ']');
    msg_handler_->SendMessage("   [" + print(homography_.at<double>(2,0)) +" "+ print(homography_.at<double>(2,1)) +" "+ print(homography_.at<double>(2,2)) + "]]");

    for (int row = 0; row < 3; ++row)
      for ( int column=0; column < 3; ++column)
        PostHomographyValue("H", row, column, homography_.at<double>(row, column));

  } else {
    ret = false;
    last_error_ = "Not enough features for homography calculation. ";
  }

  return ret;
}

void Stitching::PostHomographyValue(
  const char* message_name, int row, int col, double value) {
  pp::VarDictionary message_dic;
  message_dic.Set("message", message_name);
  message_dic.Set("row", row);
  message_dic.Set("column", col);
  message_dic.Set("value", value);
  msg_handler_->SendMessage(message_dic);
}

const void Stitching::SetImageData(
    int idx, int height, int width, const uint32_t* array) {
  memcpy(input_img_rgba_[idx]->ptr(), array, height * width * 4);
  cv::cvtColor(*input_img_rgba_[idx], *input_img_rgb_[idx], CV_RGBA2RGB);
  cv::cvtColor(*input_img_rgb_[idx], *input_img_[idx], CV_RGB2GRAY);
}

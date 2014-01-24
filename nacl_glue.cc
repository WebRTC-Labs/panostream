
#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include "ppapi/cpp/var_array.h"
#include "ppapi/cpp/var_dictionary.h"
#include "ppapi/cpp/var_array_buffer.h"

#include "stitching.h"

class NaClGlueInstance : public pp::Instance, public MessageDispatcher {
 public:
  explicit NaClGlueInstance(PP_Instance instance) :
      pp::Instance(instance),
      stitching_(2) {

    std::string banner("Initialised OpenCV version: ");
    banner += stitching_.GetOpenCVVersion();
    bool res = stitching_.InitialiseOpenCV(320, 240);
    banner += (res ? " - OK" : (" - " + stitching_.last_error()));
    SendMessage(banner);

    stitching_.SetMessageHandler(this);
  }
  virtual ~NaClGlueInstance() {}

  virtual void HandleMessage(const pp::Var& var_message) {
    if (var_message.is_string()) {
      SendMessage("Command: " + var_message.AsString());
      bool result = stitching_.CalculateHomography();
      SendMessage(result ? "Done, OK" : (" - " + stitching_.last_error()));

    } else if (var_message.is_dictionary()) {
      SendMessage("I got a dictionary with image and its index");
      pp::VarDictionary dictionary(var_message);
      std::string message = dictionary.Get("message").AsString();
      if (message == "data") {
        int width = dictionary.Get("width").AsInt();
        int height = dictionary.Get("height").AsInt();
        int index = dictionary.Get("index").AsInt();
        pp::VarArrayBuffer array_buffer(dictionary.Get("data"));
        if (index >=0 && index < 2 && width > 0 && height > 0) {
          uint32_t* pixels = static_cast<uint32_t*>(array_buffer.Map());
          stitching_.SetImageData(index, height, width, pixels);
          array_buffer.Unmap();
        }
      }
    } else {
      SendMessage("I got some message from JS I don't understand.");
    }
  }

  // MessageDispatcher interface method.
  virtual void SendMessage(std::string message) {
    PostMessage(pp::Var(message));
  }

  // MessageDispatcher interface method.
  virtual void SendMessage(pp::VarDictionary dictionary) {
    PostMessage(pp::Var(dictionary.pp_var()));
  }

 private:
  Stitching stitching_;
};

class NaClGlueModule : public pp::Module {
 public:
  NaClGlueModule() : pp::Module() {}
  virtual ~NaClGlueModule() {}

  virtual pp::Instance* CreateInstance(PP_Instance instance) {
    return new NaClGlueInstance(instance);
  }
};

namespace pp {
Module* CreateModule() {
  return new NaClGlueModule();
}
}  // namespace pp

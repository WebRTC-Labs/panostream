#
# If NACL_SDK_ROOT is not set, then fail with a nice message.
#
THIS_MAKEFILE := $(abspath $(lastword $(MAKEFILE_LIST)))
#NACL_SDK_ROOT ?= $(abspath $(dir $(THIS_MAKEFILE))../..)

# Project Build flags
WARNINGS := -Wno-long-long -Wall -Wswitch-enum -pedantic -Werror
CXXFLAGS := -pthread -std=gnu++98 $(WARNINGS)

#
# Compute tool paths
#
GETOS := python $(NACL_SDK_ROOT)/tools/getos.py
OSHELPERS = python $(NACL_SDK_ROOT)/tools/oshelpers.py
OSNAME := $(shell $(GETOS))
RM := $(OSHELPERS) rm

PNACL_TC_PATH := $(abspath $(NACL_SDK_ROOT)/toolchain/$(OSNAME)_pnacl)
PNACL_CXX := $(PNACL_TC_PATH)/bin/pnacl-clang++
PNACL_FINALIZE := $(PNACL_TC_PATH)/bin/pnacl-finalize
CXXFLAGS := -I$(NACL_SDK_ROOT)/include
LDFLAGS := -L$(NACL_SDK_ROOT)/lib/pnacl/Release -lppapi_cpp -lppapi


HDRS := stitching.h
SRCS := stitching.cc nacl_glue.cc

## Note that OPENCV should have been compiled and installed in the appropriate
## NaCl (pnacl, hopefully here) toolching pseudo root. So no need to paste any
CXXFLAGS += -I../naclports/src/out/repository/opencv-2.4.7/include/
LDFLAGS  += -lopencv_features2d \
	          -lopencv_flann \
            -lopencv_legacy \
            -lopencv_calib3d \
            -lopencv_imgproc \
            -lopencv_core \
            -lz

# Declare the ALL target first, to make the 'all' target the default build
all: guard-NACL_SDK_ROOT nacl_glue.pexe

clean:
	$(RM) *.pexe *.bc

nacl_glue.bc: $(SRCS) $(HDRS)
	$(PNACL_CXX) -O2 $(CXXFLAGS) $(SRCS) $(LDFLAGS)   -o $@

nacl_glue.pexe: nacl_glue.bc
	$(PNACL_FINALIZE) -o $@ $<


guard-NACL_SDK_ROOT:
	@if [ "${NACL_SDK_ROOT}" == "" ]; then \
	  tput setaf 1; \
	  echo "Environment variable $* not set, please define it pointing to\
 your nacl_sdk/pepper_XY folder. See \
 http://developers.google.com/native-client/dev/"; \
    tput sgr 0; \
	  exit 1; \
	fi

#
# Makefile target to run the SDK's simple HTTP server and serve this example.
#
HTTPD_PY := python ./tools/httpd.py

.PHONY: serve
serve: all
	$(HTTPD_PY) -C $(CURDIR)

options = -use-network=true -compiler.optimize -default-background-color=0xFFFFFF -static-link-runtime-shared-libraries=true
mxmlc = /opt/flex_sdk/bin/mxmlc

all: depage_player.swf

depage_player.swf : depage_player.as
	$(mxmlc) $(options) depage_player.as

install : depage_player.swf
	cp *.swf ../www/js/depage_player/

clean : 
	rm *.swf

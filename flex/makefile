options = -use-network=true -compiler.optimize -default-background-color=0xFFFFFF
mxmlc = /opt/flex_sdk_3/bin/mxmlc

all: depage_player.swf

depage_player.swf : depage_player.as
	$(mxmlc) $(options) depage_player.as

install : depage_player.swf
	cp *.swf ../www/lib/

clean : 
	rm *.swf

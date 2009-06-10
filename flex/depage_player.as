package {
    /* {{{ imports */
    // basic
    import flash.display.Sprite;

    // stage
    import flash.display.StageAlign;
    import flash.display.StageScaleMode;

    // events
    import flash.events.Event;

    // for text
    import flash.text.TextField;

    // for Video
    import flash.media.Video;
    import flash.net.NetConnection;
    import flash.net.NetStream;
    /* }}} */

    public class depage_player extends Sprite { 
        /* {{{ variables */
        private var debug:TextField;
        private var video:Video;
        /* }}} */
        /* {{{ constructor depage_player */
        public function depage_player():void {
            super();

            stage.scaleMode = StageScaleMode.NO_SCALE;
            stage.align = StageAlign.TOP_LEFT;

            stage.addEventListener(Event.RESIZE, resizeHandler);

            debug = new TextField();
            debug.height = 100;
            debug.width = 100;

            addChild(debug);

            //video = new Video();

            //addChild(video);
        }
        /* }}} */
        /* {{{ resizeHandler */
        public function resizeHandler(event:Event):void {
            debug.text = stage.stageWidth + "/" + stage.stageHeight;
        }
        /* }}} */
    } 
}

/* vim:set ft=actionscript sw=4 sts=4 fdm=marker : */

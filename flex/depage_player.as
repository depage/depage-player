package {
    /* {{{ imports */
    // basic
    import flash.display.Sprite;

    // stage
    import flash.display.StageAlign;
    import flash.display.StageScaleMode;
    import flash.display.StageDisplayState;

    // events
    import flash.events.*;

    // for text
    import flash.text.TextField;

    // for Video
    import flash.media.Video;
    import flash.net.NetConnection;
    import flash.net.NetStream;

    // for sound
    import flash.media.SoundTransform;
    
    // timer
    import flash.utils.Timer;

    // external
    import flash.external.ExternalInterface;
    /* }}} */

    public class depage_player extends Sprite { 
        /* {{{ variables */
        private var debug:TextField;
        private var src:String;

        private var videoURL:String;
        private var connection:NetConnection;
        private var stream:NetStream;
        private var videoSprite:Sprite;
        private var video:Video = new Video();

        private var isDblClick:Boolean;
        private var dblClickTimer:Timer = new Timer(300, 1);

        private var sndTrans:SoundTransform;
        /* }}} */

        //basic
        /* {{{ constructor depage_player */
        public function depage_player():void {
            super();

            stage.scaleMode = StageScaleMode.NO_SCALE;
            stage.align = StageAlign.TOP_LEFT;

            stage.addEventListener(Event.ADDED, resizeHandler);
            stage.addEventListener(Event.RESIZE, resizeHandler);
            stage.addEventListener(KeyboardEvent.KEY_DOWN, keyHandler);

            dblClickTimer.addEventListener("timer", videoClickReal);

            debug = new TextField();
            debug.height = 20;
            debug.width = 100;

            addChild(debug);

            if (ExternalInterface.available) {
                ExternalInterface.addCallback("loadMedia", loadMedia);
                ExternalInterface.addCallback("togglePause", togglePause);
            }

            loadMedia("http://metultelet.local/projects/dp_player/lib/testmovie.mp4");
        }
        /* }}} */
        /* {{{ resizeHandler */
        public function resizeHandler(event:Event):void {
            debug.text = stage.stageWidth + "/" + stage.stageHeight;
            debug.x = 10;
            debug.y = stage.stageHeight - debug.height;
            debug.width = stage.stageWidth - 20;

            if (video) {
                video.width = stage.stageWidth;
                video.height = stage.stageHeight;
            }
        }
        /* }}} */
        /* {{{ loadMedia */
        public function loadMedia(url:String):void {
            loadVideo(url);
        }
        /* }}} */

        //key handler
        /* {{{ keyHandler */
        public function keyHandler(event:KeyboardEvent):void {
            debug.text = "key: " + event.charCode;
            switch (event.charCode) {
                case 102: // f
                    toggleFullscreen();
                    break;
                case 32: // SPACE
                    togglePause();
                    break;
            }
        }
        /* }}} */

        //video
        /* {{{ loadVideo */
        public function loadVideo(url:String):void {
            videoURL = url;

            connection = new NetConnection();
            connection.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
            connection.addEventListener(SecurityErrorEvent.SECURITY_ERROR, securityErrorHandler);
            connection.connect(null);
        }
        /* }}} */
        /* {{{ toggleFullscreen */
        private function toggleFullscreen():void {
            if (stage.displayState == StageDisplayState.NORMAL) { 
                stage.displayState = StageDisplayState.FULL_SCREEN;
            } else {
                stage.displayState = StageDisplayState.NORMAL;
            }
        }
        /* }}} */
        /* {{{ togglePause */
        private function togglePause():void {
            stream.togglePause();
        }
        /* }}} */

        /* {{{ netStatusHandler */
        private function netStatusHandler(event:NetStatusEvent):void {
            switch (event.info.code) {
                case "NetConnection.Connect.Success":
                    connectStream();
                    break;
                case "NetStream.Play.StreamNotFound":
                    debug.text = "Unable to locate video: " + videoURL;
                    break;
            }
        }
        /* }}} */
        /* {{{ connectStream */
        private function connectStream():void {
            stream = new NetStream(connection);

            stream.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
            stream.addEventListener(AsyncErrorEvent.ASYNC_ERROR, asyncErrorHandler);

            sndTrans = new SoundTransform();
            //mute
            sndTrans.volume = 0;
            soundTransform = sndTrans;

            video.attachNetStream(stream);
            stream.play(videoURL);

            videoSprite = new Sprite();
            addChild(videoSprite);
            swapChildren(debug, videoSprite);

            videoSprite.addChild(video);
            videoSprite.useHandCursor = true;

            videoSprite.doubleClickEnabled = true;
            videoSprite.addEventListener(MouseEvent.CLICK, videoClick);
            videoSprite.addEventListener(MouseEvent.DOUBLE_CLICK, videoDoubleClick);
        }
        /* }}} */
        /* {{{ videoClick */
        private function videoClick(event:MouseEvent):void {
            isDblClick = false;
            dblClickTimer.start();
        }
        /* }}} */
        /* {{{ videoClickReal */
        private function videoClickReal(event:TimerEvent):void {
            if (!isDblClick) {
                togglePause();
            }
        }
        /* }}} */
        /* {{{ videoDoubleClick */
        private function videoDoubleClick(event:MouseEvent):void {
            isDblClick = true;

            toggleFullscreen();
        }
        /* }}} */
        /* {{{ securityErrorHandler */
        private function securityErrorHandler(event:SecurityErrorEvent):void {
            debug.text = "securityErrorHandler: " + event;
        }
        /* }}} */
        /* {{{ asyncErrorHandler */
        private function asyncErrorHandler(event:AsyncErrorEvent):void {
            // ignore
        }
        /* }}} */
    } 
}

/* vim:set ft=actionscript sw=4 sts=4 fdm=marker : */

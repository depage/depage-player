package {
    /* {{{ imports */
    // basic
    import flash.display.Sprite;
    import flash.display.Shape;

    // stage
    import flash.display.StageAlign;
    import flash.display.StageScaleMode;
    import flash.display.StageDisplayState;
    import flash.display.LoaderInfo;

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
        private var tdebug:TextField;
        private var back:Shape;
        private var src:String;

        private var paused:Boolean = true;
        private var videoURL:String;
        private var connection:NetConnection;
        private var stream:NetStream;
        private var videoSprite:Sprite;
        private var video:Video = new Video();
        private var playerId:String;

        private var isDblClick:Boolean;
        private var dblClickTimer:Timer = new Timer(300, 1);

        private var vidTimer:Timer = new Timer(250);

        private var sndTrans:SoundTransform;

        private var currentTime:Number = 0;
        private var percentLoaded:Number = 0;
        /* }}} */

        //basic
        /* {{{ constructor depage_player */
        public function depage_player():void {
            super();

            playerId = loaderInfo.parameters.id;
            stage.scaleMode = StageScaleMode.NO_SCALE;
            stage.align = StageAlign.TOP_LEFT;

            stage.addEventListener(Event.ADDED, addedHandler);
            stage.addEventListener(Event.RESIZE, resizeHandler);
            stage.addEventListener(KeyboardEvent.KEY_DOWN, keyHandler);

            dblClickTimer.addEventListener("timer", videoClickReal);

            back = new Shape();

            back.graphics.beginFill(0x000000);
            //back.graphics.beginFill(0xdddddd);
            back.graphics.drawRect(0, 0, 2000, 2000);
            back.graphics.endFill();

            addChild(back);

            tdebug = new TextField();
            tdebug.height = 20;
            tdebug.width = 100;

            addChild(tdebug);
        }
        /* }}} */
        /* {{{ addedHandler */
        public function addedHandler(event:Event):void {
            onResize();

            if (ExternalInterface.available) {
                ExternalInterface.addCallback("fload", load);
                ExternalInterface.addCallback("ftogglePause", togglePause);
                ExternalInterface.addCallback("fplay", play);
                ExternalInterface.addCallback("fpause", pause);
                ExternalInterface.addCallback("fseek", seek);
            }
        }
        /* }}} */
        /* {{{ resizeHandler */
        public function resizeHandler(event:Event):void {
            onResize();
        }
        /* }}} */
        /* {{{ onResize */
        public function onResize():void {
            tdebug.x = 10;
            tdebug.y = stage.stageHeight - tdebug.height;
            tdebug.width = stage.stageWidth - 20;

            if (video) {
                if (video.videoWidth / video.videoHeight < stage.stageWidth / stage.stageHeight) {
                    video.width = (video.videoWidth / video.videoHeight) * stage.stageHeight;
                    video.height = stage.stageHeight;

                    debug("event: resize " + stage.stageWidth + "/" + stage.stageHeight  + " smaller");
                } else if (video.videoWidth / video.videoHeight > stage.stageWidth / stage.stageHeight) {
                    video.width = stage.stageWidth;
                    video.height = stage.stageWidth * (video.videoHeight / video.videoWidth);

                    debug("event: resize " + stage.stageWidth + "/" + stage.stageHeight  + " bigger");
                } else {
                    video.width = stage.stageWidth;
                    video.height = stage.stageHeight;

                    debug("event: resize " + stage.stageWidth + "/" + stage.stageHeight  + " same");
                }
                video.x = (stage.stageWidth - video.width) / 2;
                video.y = (stage.stageHeight - video.height) / 2;
            }
            back.width = stage.stageWidth;
            back.height = stage.stageHeight;
        }
        /* }}} */
        /* {{{ load*/
        public function load(url:String):Boolean {
            loadVideo(url);

            return true;
        }
        /* }}} */

        //key handler
        /* {{{ keyHandler */
        public function keyHandler(event:KeyboardEvent):void {
            debug("key: " + event.charCode + " (" + loaderInfo.parameters.id + ")");
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

            debug("video: " + videoURL);

            connection = new NetConnection();
            connection.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
            connection.addEventListener(SecurityErrorEvent.SECURITY_ERROR, securityErrorHandler);
            connection.connect(null);
        }
        /* }}} */
        /* {{{ toggleFullscreen */
        private function toggleFullscreen():void {
            debug("toogle fullscreen");

            if (stage.displayState == StageDisplayState.NORMAL) { 
                stage.displayState = StageDisplayState.FULL_SCREEN;
            } else {
                stage.displayState = StageDisplayState.NORMAL;
            }
        }
        /* }}} */
        /* {{{ togglePause */
        private function togglePause():Boolean {
            if (paused) {
                play();
            } else {
                pause();
            }

            return true;
        }
        /* }}} */
        /* {{{ play */
        private function play():Boolean {
            debug("action: play");

            vidTimer.start();
            paused = false;
            setJSvar("paused", paused);
            stream.resume();

            return true;
        }
        /* }}} */
        /* {{{ pause */
        private function pause():Boolean {
            debug("action: pause");

            vidTimer.stop();
            paused = true;
            setJSvar("paused", paused);
            stream.pause();

            return true;
        }
        /* }}} */
        /* {{{ seek */
        private function seek(offset:Number):Boolean {
            debug("action: seek to " + offset);

            stream.seek(offset);
            setJSvar("currentTime", offset);

            return true;
        }
        /* }}} */
        /* {{{ setJSvar */
        private function setJSvar(name:String, value:*):void {
            if (ExternalInterface.available) {
                ExternalInterface.call("setPlayerVar", playerId, name, value);
            }
        }
        /* }}} */
        /* {{{ debug */
        private function debug(msg:String):void {
            /*
            if (ExternalInterface.available) {
                ExternalInterface.call("debug", msg);
            }
            */
        }
        /* }}} */

        /* {{{ netStatusHandler */
        private function netStatusHandler(event:NetStatusEvent):void {
            switch (event.info.code) {
                case "NetStream.FileStructureInvalid":
                    debug("The MP4's file structure is invalid.");
                    break;
                case "NetStream.NoSupportedTrackFound":
                    debug("The MP4 doesn't contain any supported tracks");
                    break;
                case "NetStream.Play.StreamNotFound":
                    debug("Unable to locate video: " + videoURL);
                    break;
                case "NetConnection.Connect.Rejected":
                    debug("NetConnection rejected.");
                    break;
                case "NetConnection.Connect.Failed":
                    debug("NetConnection failed.");
                    break;
                case "NetStream.Play.Failed":
                    debug("Unknown error during play occured.");
                    break;

                case "NetStream.Seek.InvalidTime":
                    debug("Trying to seek to an invalid time.");
                    break;

                case "NetConnection.Connect.Success":
                    debug("Connecting to stream: " + videoURL);
                    connectStream();
                    break;
            }
        }
        /* }}} */
        /* {{{ connectStream */
        private function connectStream():void {
            debug("stream connect successful");

            stream = new NetStream(connection);

            // add 5 seconds buffer time
            stream.bufferTime = 5;

            stream.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
            stream.addEventListener(AsyncErrorEvent.ASYNC_ERROR, asyncErrorHandler);
            stream.addEventListener(flash.events.IOErrorEvent.IO_ERROR, ioErrorHandler);
            stream.client = this;

            sndTrans = new SoundTransform();

            //mute
            sndTrans.volume = 1;
            soundTransform = sndTrans;

            debug("attaching stream to video component");

            video.smoothing = true;

            video.attachNetStream(stream);
            stream.play(videoURL);
            paused = false;
            setJSvar("paused", paused);

            vidTimer.start();
            vidTimer.addEventListener(TimerEvent.TIMER, updateTime);

            videoSprite = new Sprite();
            addChild(videoSprite);
            swapChildren(tdebug, videoSprite);

            videoSprite.addChild(video);
            videoSprite.useHandCursor = true;

            videoSprite.doubleClickEnabled = true;
            videoSprite.addEventListener(MouseEvent.CLICK, videoClick);
            videoSprite.addEventListener(MouseEvent.DOUBLE_CLICK, videoDoubleClick);
        }
        /* }}} */
        /* {{{ videoClick */
        private function videoClick(event:MouseEvent):void {
            debug("event: click on video");

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
            debug("event: doubleclick on video");

            isDblClick = true;

            toggleFullscreen();
        }
        /* }}} */
        /* {{{ updateTime */
        private function updateTime(event:TimerEvent):void {
            var ct:Number = Math.floor(stream.time * 10) / 10;
            var pl:Number = Math.floor(stream.bytesLoaded / stream.bytesTotal * 10) / 10;

            if (currentTime != ct) {
                setJSvar("currentTime", ct);
                currentTime = ct;
            }
            if (percentLoaded != pl) {
                setJSvar("percentLoaded", pl);
                percentLoaded = pl;
            }
        }
        /* }}} */

        /* {{{ securityErrorHandler */
        private function securityErrorHandler(event:SecurityErrorEvent):void {
            debug("securityErrorHandler: " + event);
        }
        /* }}} */
        /* {{{ asyncErrorHandler */
        private function asyncErrorHandler(event:AsyncErrorEvent):void {
            debug("asyncErrorHandler: " + event);
        }
        /* }}} */
        /* {{{ ioErrorHandler */
        private function ioErrorHandler(event:IOErrorEvent):void {
            debug("ioErrorHandler: " + event);
        }
        /* }}} */

        /* {{{ onMetaData */
        public function onMetaData(info:Object):void {
            debug("metadata arrived:");
            for(var propName:String in info) {
                    debug("- " + propName + " = " + info[propName]);
            }
        }
        /* }}} */
        /* {{{ onCuePoint */
        public function onCuePoint(info:Object):void {
            debug("cuepoint: time=" + info.time + " name=" + info.name + " type=" + info.type);
        }
        /* }}} */

    } 
}

/* vim:set ft=actionscript sw=4 sts=4 fdm=marker : */

/**
 * @require framework/shared/jquery-1.4.2.js
 * @require depage-flash.js
 * 
 * @file depage-player.js
 * 
 * Adds a custom video player, using either HTML5 video if available, or falling back to flash if not.
 * 
 * copyright (c) 2006-2012 Frank Hellenkamp [jonas@depagecms.net]
 * 
 * @author Ben Wallis
 */
;(function($){
    if(!$.depage){
        $.depage = {};
    };
    
    /**
     * Shiv Video
     * 
     * Adds video element to the DOM to enable recognition in ie.
     * 
     * @return void
     */
    if ($.browser.msie && $.browser.version < 9) {
        $('head').append('<style>video{display:inline-block;*display:inline;*zoom:1}</style>');
        document.createElement("video");
        document.createElement("source");
    }
    
    
    /**
     * Depage Player
     * 
     * @param el
     * @param param1
     * @param options
     * 
     * @return context
     */
    $.depage.player = function(el, index, options){
        // To avoid scope issues, use 'base' instead of 'this' to reference this
        // class from internal events and functions.
        var base = this;
        
        // Access to jQuery and DOM versions of element
        base.$el = $(el);
        base.el = el;
        
        // Add a reverse reference to the DOM object
        base.$el.data("depage.player", base);
        
        // Namespacing
        base.html5 = {};
        base.flash = {};
        
        var video = $('video', base.$el)[0];
        var duration = $("a", base.$el).attr("data-video-duration"); // TODO get from video?
        var indicator = $("a.indicator", base.$el);
        
        // Cache the control selectors
        base.controls = {};
        
        // {{{ init()
        /**
         * Init
         * 
         * Setup the options. Determine the player to be used - HTML5 or Flash.
         * 
         * @return void
         */
        base.init = function(){
            base.options = $.extend({}, $.depage.player.defaultOptions, options);
            
            base.options.width = base.options.width || video.width;
            base.options.height = base.options.height || video.height;
            
            base.options.playerId = base.options.playerId + index;
        };
        // }}}
        
        
        // {{{ videoSupport()
        /**
         * Video Support
         * 
         * Modernizr script checks HTML5 video support in the browser.
         * 
         * http://www.modernizr.com/
         * 
         * NB IE9 Running on Windows Server SKU can cause an exception to be thrown, bug #224
         * 
         * @returns boolean
         * 
         */
        base.videoSupport = function (){
            var bool = new Boolean(false);
                
            try {
                bool.ogg = video.canPlayType('video/ogg; codecs="theora"').replace(/^no$/,'');
                bool.h264 = video.canPlayType('video/mp4; codecs="avc1.42E01E"').replace(/^no$/,'');
                bool.webm = video.canPlayType('video/webm; codecs="vp8, vorbis"').replace(/^no$/,'');
                bool.flash = $.depage.flash({requiredVersion:"9,0,115"}).detect(); // earliest support for flash player with h264
            } catch(e) { }
            
            return bool;
        };
        // }}}
        
        
        // {{{ video
        /**
         * Video
         * 
         * Entry point to build the video.
         *  - Adds the wrapper div
         *  - Build the controls
         *  - Adds indicator click handler
         *  - Autoloads
         * 
         * @return void
         */
        base.video = function() {
            
            var support = base.videoSupport();
            
            // TODO determine sources available
            if ( support.h264 ) {
                // HTML5 VIDEO
                base.player = video;
                base.html5.bind();
            } else if (support.flash) {
                // FLASH
                 base.player = { initialized: false };
                 base.flash.transport();
                 
                 if (video.preload || video.autobuffer) {
                     base.flash.insertPlayer();
                 }
                 
                 if (video.autoplay) {
                     base.player.play();
                 }
            }
            else {
                // VIDEO UNSUPPORTED
                return false;
            }
            
            indicator.click(function() {
                base.player.play();
                $(this).hide();
                return false;
            });
            
            base.$el.wrapInner("<div class=\"wrapper\"></div>");
            
            base.addControls();
        };
        // }}}
        
        
        // {{ html5 bind
        /**
         * HTML5 Bind Media Events
         * 
         * @return void
         */
        base.html5.bind = function(){
            
            var $video = $(video);
            
            $video.bind("play", function(){
                base.play();
            });
            
            $video.bind("playing", function(){
                base.play();
            });
            
            $video.bind("pause", function(){
                base.pause();
            });
            
            $video.bind("durationchange", function(){
                base.duration(this.duration);
            });
            
            $video.bind("timeupdate", function(){
                base.setCurrentTime(this.currentTime);
             });
            
            var defer = null;
            
            $video.bind("progress", function(){
                
                var progress = function(){
                    var loaded = 0;
                    if (video.buffered && video.buffered.length > 0 && video.buffered.end && video.duration) {
                        loaded = video.buffered.end(video.buffered.length-1) / video.duration;
                    } 
                    // for browsers not supporting buffered.end (e.g., FF3.6 and Safari 5)
                    else if (typeof(video.bytesTotal) !== 'undefined' && video.bytesTotal > 0
                            && typeof(video.bufferedBytes) !== 'undefined') {
                        loaded = video.bufferedBytes / video.bytesTotal;
                    }
                    
                    base.percentLoaded(loaded);
                    
                    // last progress event not fired
                    if ( !defer && loaded < 1 ) {
                        defer = setInterval(function(){ progress(); }, 1500);
                    }
                    else if (loaded >= 1) {
                        clearInterval(defer);
                    }
                    //alert(loaded);
                };
                
                progress();
            });
            
            if (base.options.width != video.width || base.options.height != video.height) {
                 base.html5.resize(base.options.width, base.options.height);
            }
            
            // create a seek method for the html5 video
            base.player.seek = function(offset){
                base.player.currentTime = offset;
            };
        };
        // }}}
        
        
        // {{ resize
        /**
         * HTML5 Resize Video
         * 
         * @return void
         */
        base.html5.resize = function(toWidth, toHeight) {
            
            var ratio = video.videoWidth / video.videoHeight;
            
            if (base.options.crop) {
                // TODO get from outer div
                var overflow = $('<div class="crop" />').css({
                    width: toWidth + 'px',
                    height: '100%',//toHeight + 'px',
                    overflow:'hidden'
                });
                
                $(video).wrap(overflow);
            }
            
            if (base.options.scale) {
                toHeight = toWidth / ratio;
            }
            
            video.height = toHeight;
            video.width = toWidth;
        };
        // }}}
        
        
        // {{{ addControls()
        /**
         * Add Controls
         * 
         * Adds flash player controls
         * 
         * @return void
         */
        base.addControls = function(){
            
            var legend = $("p.legend", base.$el);
            var requirements = $("p.requirements", base.$el);
            
            var imgSuffix = ($.browser.msie && parseInt($.browser.version) < 7) ? ".gif" : ".png";
            
            var div = $("<div class=\"controls\"></div>");
            
            base.controls.play = $("<a class=\"play\"><img src=\"" + base.options.scriptPath + "play_button" + imgSuffix + "\" alt=\"play\"></a>")
                .appendTo(div)
                .click(function() {
                    base.player.play();
                    return false;
                });
            
            base.controls.pause = $("<a class=\"pause\" style=\"display: none\"><img src=\"" + base.options.scriptPath + "pause_button" + imgSuffix + "\" alt=\"pause\"></a>")
                .appendTo(div)
                .click(function() {
                    base.player.pause();
                    return false;
                });
            
            base.controls.rewind = $("<a class=\"rewind\"><img src=\"" + base.options.scriptPath + "rewind_button" + imgSuffix + "\" alt=\"rewind\"></a>")
                .appendTo(div)
                .click(function() {
                    base.player.seek(0);
                    return false;
                });
            
            base.controls.progress = $("<span class=\"progress\" />")
                .mouseup(function(e) {
                    var offset = (e.pageX - $(this).offset().left) / $(this).width() * duration;
                    base.player.seek(offset);
                });
            
            base.controls.buffer = $("<span class=\"buffer\"></span>")
                .appendTo(base.controls.progress);
            
            base.controls.position = $("<span class=\"position\"></span>")
                .appendTo(base.controls.progress);
            
            base.controls.progress.appendTo(div);
            
            base.controls.time = $("<span class=\"time\" />");
            
            base.controls.current = $("<span class=\"current\">00:00/</span>")
                .appendTo(base.controls.time);
            
            base.controls.duration = $("<span class=\"duration\">" + base.floatToTime(duration) + "</span>")
                .appendTo(base.controls.time);
            
            base.controls.time.appendTo(div);
            
            $("<p class=\"legend\"><span>" + legend.text() + "</span></p>").appendTo(div);
            
            div.appendTo(base.$el);
            
            legend.hide();
            requirements.hide();
        };
        // }}}
        
        
        // flash.transport() {{{
        /**
         * Flash Transport
         * 
         * Adds transport actions to the flash player.
         * 
         * Uses set interval to wait for flash initialization.
         * 
         * @return void
         */
        base.flash.transport = function() {
            
            var actions = [ "load", "play", "pause", "seek" ];
            
            $.each ( actions, function (i, action) {
                
                base.player[action] = function() {
                    
                    if (!base.player.initialized) {
                        base.flash.insertPlayer();
                    }
                    
                    var code = base.flash.serialize(action, Array.prototype.slice.call(arguments));
                    
                    var caller = setInterval(function() {
                        try {
                            if (($.browser.msie && eval("window['" + base.options.playerId + "'].f" + code))
                                     || eval("document['" + base.options.playerId + "'].f" + code)){
                                 clearInterval(caller);
                            }
                        } catch (e) {}
                    }, 300);
                };
            });
        };
        // }}}
        
        
        // {{{ serialize()
        /**
         * Flash Serialize
         * 
         * Seriliazes the arguments parsed to the flash player object
         * 
         * @param string action - control action called
         * @param array args - flash player arguments
         * 
         * @return string code
         */ 
        base.flash.serialize = function ( action, args ){
            
            $.each(args, function(i, arg){
                args[i] = '"' + arg.replace('"', '\"') + '"';
            });
           
            return action + "(" + args.join(',') + ");";
        };
        // }}}
        
        
        // {{{ flash.insertPlayer()
        /**
         * Insert Flash Player
         * 
         * Insert the flash object for the player using the depage flash plugin.
         * 
         * Overwrites the video player.
         * 
         * TODO could not get flash playting in video fallback?
         * 
         * @return void
         */
        base.flash.insertPlayer = function() {
            
            var url = indicator[0].href;
            
            var html = $.depage.flash().build({
                src    : base.options.playerPath,
                width  : base.options.width,
                height : base.options.height,
                id     : base.options.playerId,
                params : {
                    id : base.options.playerId
                }
            });
            
            $("video", base.$el).replaceWith(innerHTML = html.plainhtml);
            
            window.setPlayerVar = base.flash.setPlayerVar;
            
            base.player.initialized = true;
            base.player.load(url);
        };
        // }}}
        
        
        // {{{ setPlayerVar()
        /**
         * Flash Set Player Var
         * 
         * This is a callback for the flash player.
         * 
         * @param action
         * @param value
         * 
         * @return void
         */
        base.flash.setPlayerVar = function(playerId, action, value) {
            
            base.player[action] = value;
            
            switch (action) {
                case "paused" : 
                    base.player.paused ? base.pause() : base.play();
                    break;
                    
                case "currentTime" :
                    base.setCurrentTime(base.player.currentTime);
                    break;
                    
                case "percentLoaded" :
                    base.percentLoaded(base.player.percentLoaded);
                    break;
                    
                case "duration" :
                    base.duration();
                    break;
            }
        };
        // }}}
        
        
        // {{{ play()
        /**
         * Play
         * 
         * @return void
         */
        base.play = function() {
            indicator.hide();
            base.controls.play.hide();
            base.controls.pause.show();
            base.controls.rewind.show();
        };
        // }}}
        
        
        // {{{ pause()
        /**
         * Pause
         * 
         * @return void
         */
        base.pause = function() {
            base.controls.play.show();
            base.controls.pause.hide();
            base.controls.rewind.show();
        };
        // }}}
        
        
        // {{ setCurrentTime
        /**
         * Set Current Time
         * 
         * @return void
         */        
        base.setCurrentTime = function(currentTime) {
            base.controls.current.html(base.floatToTime(currentTime) + "/");
            base.controls.position.width(Math.min(currentTime / duration * 100, 100) + "%");
        };
        // }}}
        
        
        // {{{ percentLoaded
        /**
         * Percent Loaded
         * 
         * @param percentLoaded
         * 
         * @return void
         */
        base.percentLoaded = function(percentLoaded){
            base.controls.buffer.width(Math.min(percentLoaded * 100, 100) + "%");
        };
        // }}}
        
        
        // {{{ duration ()
        /**
         * Duration 
         * 
         * @param duration
         * 
         */
        base.duration = function(duration) {
            base.controls.duration.html(base.floatToTime(duration));
        };
        // }}}
        
        
        // {{{ floatToTime() 
        /**
         * FloatToTime
         * 
         * Converts to a float time to a string for display
         * 
         * @param value
         * 
         * @return string - "MM:SS"
         */
        base.floatToTime = function(value) {
            var mins = String("00" + Math.floor(value / 60)).slice(-2);
            var secs = String("00" + Math.floor(value) % 60).slice(-2);
           
            return mins + ":" + secs;
        };
        // }}}
        
        
        // Run initializer
        base.init();
        
        // Build the video
        base.video();
        
        return base;
    };
    
    /**
     * Options
     * 
     * @param playerPath - path to player folder
     * @param playerName - name of the flash swf
     * @param playerId
     * @param width - video width
     * @param height - video height
     * @param crop - crop this video when resizing
     * @param scale - scale this video when resizing
     */
    $.depage.player.defaultOptions = {
        playerPath : "js/depage_player/depage_player.swf",
        scriptPath : "js/depage_player/",
        playerId : "dpPlayer",
        width : 600,
        height : 400,
        crop: true,
        scale: true
    };
    
    $.fn.depage_player = function(param1, options){
        return this.each(function(index){
            (new $.depage.player(this, index, options));
        });
    };
    
})(jQuery);
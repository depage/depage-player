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
                    
                    // last progress event not fired in all browsers
                    if ( !defer && loaded < 1 ) {
                        defer = setInterval(function(){ progress(); }, 1500);
                    }
                    else if (loaded >= 1) {
                        clearInterval(defer);
                    }
                };
                
                progress();
            });
            
            if (base.options.width != video.width || base.options.height != video.height) {
                
                 var height = base.options.height || base.$el.height();
                 var width = base.options.width || base.$el.width();
                
                 base.resize(width, height);
            }
            
            /**
             * HTML5 Seek
             * 
             * Create a seek method for the html5 player
             * 
             * @return false
             */
            base.player.seek = function(offset){
                base.player.currentTime = offset;
                return false;
            };
            
            /**
             * HTML5 Fullscreen
             * 
             * Create a fullscreen method for the html5 player
             * 
             * @return false
             */
            base.player.fullscreen = function(){
                
                base.fullscreen();
                return false;
                
                if (typeof(base.player.webkitEnterFullScreen) !== 'undefined') {
                    base.player.webkitEnterFullScreen();
                } else if (typeof(base.player.webkitRequestFullScreen) !== 'undefined') {
                    // webkit (works in safari and chrome canary)
                    base.player.webkitRequestFullScreen();
                } else if (typeof(base.player.mozRequestFullScreen) !== 'undefined'){
                    // firefox (works in nightly)
                    base.player.mozRequestFullScreen();
                } else if (typeof(base.player.requestFullScreen) !== 'undefined') {
                	// mozilla proposal
                    base.player.requestFullScreen();
                } else if (typeof(element.requestFullscreen) !== 'undefined') {
                    // w3c proposal
                    base.player.requestFullscreen();
                } else {
                    // fallback
                    base.resize(screen.width, screen.height);
                }
                return false;
            };
            
            /**
             * HTML5 Exit Fullscreen
             * 
             * Exit fullscreen method required for fallback
             * 
             * @return false
             */
            base.player.exitfullscreen = function(){
                
                base.exitFullscreen();
                return false;
                
                if (typeof(base.player.webkitExitFullScreen) !== 'undefined') {
                    base.player.webkitExitFullScreen();
                } else if (typeof(document.webkitCancelFullScreen) !== 'undefined') {
                    // webkit (works in safari and chrome canary)
                    document.webkitCancelFullScreen();
                } else if (typeof(document.mozCancelFullScreen) !== 'undefined'){
                    // firefox (works in nightly)
                    document.mozCancelFullScreen();
                } else if (typeof(document.cancelFullScreen) !== 'undefined') {
                    // mozilla proposal
                    document.cancelFullScreen();
                } else if (typeof(element.requestFullscreen) !== 'undefined') {
                    // w3c proposal
                    base.player.requestFullscreen();
                } else {
                    // fallback
                    base.exitFullscreen();
                }
                return false;
            };
        };
        // }}}
        
        
        // {{{ resize
        /**
         * Resize Player
         * 
         * @return void
         */
        base.resize = function(toWidth, toHeight) {
            
            // get the player object HTML5 video or flash
            var $player = $('video', base.$el);
            
            if ($player.length === 0){
                // FLASH
                $player = $('#' + base.options.playerId, base.$el);
            }
            
            var ratio = $player.is('video') // TODO make param
                ? $player[0].videoWidth / $player[0].videoHeight
                : $player[0].width / $player[0].height;
            
            // scale to outer div maintain constraints
            if (base.options.constrain) {
                if (toWidth / toHeight < ratio) {
                    toWidth = Math.ceil(ratio * toHeight);
                } else {
                    toHeight = Math.ceil(toWidth / ratio);
                }
            }
            
            // add a crop overlay to match wrapper
            if (base.options.crop){
                
                var cropWidth = base.$el.width();
                var cropHeight = base.$el.height();
                
                if (cropWidth && cropHeight) {
                    
                    base.addOverlay($player, cropWidth, cropHeight);
                    
                    if (!$player.is('object')) {
                        // HTML 5 (changing flash player properties causes reframe)
                        // center video
                        $player
                           .css({ 
                                position: 'relative',
                                left: (cropWidth - toWidth) / 2,
                                top: (cropHeight - toHeight) / 2,
                        });
                    }
                }
            }
            
            if ($player.is('object')) {
                // FLASH - scale wrapper
                $('.crop', base.$el)
                    .width(toWidth)
                    .height(toHeight);
                $('.wrapper', base.$el)
                	.width(toWidth)
                	.height(toHeight);
            } else {
                $player
                    .width(toWidth)
                    .height(toHeight);
            }
        };
        // }}}
        
        
        // addOverlay {{{
        /**
         * Add Overlay
         * 
         * Checks if an overlay container exists on the given element (video player).
         * And adds it if not - this allows the video to be cropped.
         * 
         * @param $croppedEl - selector to wrap
         * @param cropWidth - width of overlay
         * @param cropHeight - height of overlay
         * 
         * @return void
         * 
         */
        base.addOverlay = function($croppedEl, cropWidth, cropHeight) {
            var css = {
                    width: cropWidth + 'px',
                    height: cropHeight + 'px',
                    overflow:'hidden'
                };
                
            var overlay = $('.crop', base.$el).css(css);
            
            if (overlay.length === 0) {
                overlay = $('<div class="crop" />').css(css);
                $croppedEl.wrap(overlay);
            }
        };
        // }}}
        
        
        // {{{
        /**
         * Fullscreen
         * 
         * @return void
         */
        base.fullscreen = function () {
            var $body = $('body');
            var $controls = $('.controls', base.$el);
            var $button = $('.fullscreen', base.$el);
            
            // save original css attributes
            var style = {
                'body': $body.attr('style'),
                'controls' : $controls.attr('style')
            };
            
            // save original dimensions
            var area = {
                'width': base.$el.width(),
                'height': base.$el.height()
            }; 
            
            var fullWidth = $(window).width();
            var fullHeight = $(window).height();
            
            // resize container
            base.$el
                .width(fullWidth)
                .height(fullHeight);
            
            // resize video
            base.resize(fullWidth, fullHeight);
            
            // set fullscreen css
            $body.css( {
                'margin':0,
                'padding':0,
                'background-color':'#000',
                // body overflow in ff causes flash to reframe
                'overflow': $('video', base.$el).length ? 'hidden' : '' // TODO make param 
            });
            
            $controls
                .css({
                    'top' : '-48px', // TODO calculate?
                    'background-color': '#fff'
                })
                // animate the controls on hover
                .bind('mouseover.fullscreen', function() {
                    $this = $(this);
                    
                    $this.stop();
                    
                    var val = 0;
                    
                    if ($this.css('opacity') < 1) {
                        val = 1;
                    }
                    
                    $this.animate({opacity:val});
                });
            
            // listen to the escape key
            $(document).bind('keyup.fullscreen', function(e){
                if (e.keyCode == 27) {
                    exitFullscreen();
                    $(document).unbind('keyup.fullscreen');
                }
            });
            
            // change button click handler
            $button
                .unbind('click')
                .click(function(){
                    exitFullscreen();
                });
            
            /**
             * Exit Fullscreen
             * 
             * @return void
             */
            var exitFullscreen = function () {
                
                // restore css attributes
                $body.removeAttr('style');
                
                if (typeof(style.body) !== 'undefined'){
                     $body.css(style.body);
                }
                
                $controls.removeAttr('style');
                
                if (typeof(style.controls) !== 'undefined'){
                     $controls.css(style.controls);
                }
                
                // restore container dimensions
                base.$el
                    .width(area.width)
                    .height(area.height);
                
                // resize video
                base.resize(area.width, area.height);
                
                // unbind control animations
                $controls.unbind('mouseover.fullscreen');
                
                // restore button click handler
                $button
                    .unbind()
                    .click(function(){
                        base.fullscreen();
                    });
            };
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
            
            base.controls.rewind = $("<a class=\"fullscreen\"><img src=\"" + base.options.scriptPath + "fullscreen_button" + imgSuffix + "\" alt=\"fullscreen\"></a>")
                .appendTo(div)
                .click(function() {
                    base.player.fullscreen();
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
                    
                    var defer = setInterval(function() {
                        call();
                    }, 300);
                    
                    var call = function() {
	                    try {
	                        if (($.browser.msie && eval("window['" + base.options.playerId + "'].f" + code))
	                                 || eval("document['" + base.options.playerId + "'].f" + code)){
	                             clearInterval(defer);
	                        }
	                    } catch (e) {}
                    };
                };
            });
            
            /**
             * Fullscreen
             * 
             * NB - Flash fullscreen cannot be controlled externally.
             * 
             * @return void
             */
            base.player.fullscreen = function() {
                base.fullscreen();
            };
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
                args[i] = '"' + String(arg).replace('"', '\"') + '"';
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
         * @return void
         */
        base.flash.insertPlayer = function() {
            
            var url = indicator[0].href;
            
            var html = $.depage.flash().build({
                src    : base.options.playerPath,
                width  : base.options.width,
                height : base.options.height,
                id     : base.options.playerId,
                transparent: true,
                params : {
                    id : base.options.playerId
                }
            });
            
            $video = $("video", base.$el);
            //base.addOverlay($video, base.options.width, base.options.height);
            $video.replaceWith(innerHTML = html.plainhtml);
            
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
     * @param constrain - constrain dimensions of this video when resizing
     */
    $.depage.player.defaultOptions = {
        playerPath : "js/depage_player/depage_player.swf",
        scriptPath : "js/depage_player/",
        playerId : "dpPlayer",
        width : 600,
        height : 400,
        crop: false,
        constrain: true
    };
    
    $.fn.depage_player = function(param1, options){
        return this.each(function(index){
            (new $.depage.player(this, index, options));
        });
    };
    
})(jQuery);
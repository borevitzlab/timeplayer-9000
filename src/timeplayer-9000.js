/**
 * Created by stormaes on 7/03/2016.
 * depends: d3 moment openseadragon
 */
import 'jquery';
import 'openseadragon';
import '../node_modules/bootstrap/dist/css/bootstrap.css';
import moment from '../node_modules/moment/src/moment';
import Dropdown from '../node_modules/bootstrap/js/src/dropdown';
import octicons from "./octicons-lite/octicons";
import './slider.css';

window.octicons = octicons;

import {csv, text, tsv, json, request} from 'd3-request';
import {scaleLinear, scaleTime, scaleOrdinal, scaleBand, schemeCategory10} from 'd3-scale';
import {map, values, keys, entries} from 'd3-collection';
import * as time from 'd3-time';
import {drag} from 'd3-drag';

import {timeFormat} from 'd3-time-format';
import {timer, timeout} from 'd3-timer';
import {line, curveBasisOpen, curveCardinalOpen, curveCatmullRomOpen, curveLinear} from 'd3-shape';

import {axisTop, axisBottom} from 'd3-axis';

import {ascending, descending, ticks, range, min, max, extent, sum, mean, median} from 'd3-array';
import {color, rgb, hsl} from 'd3-color';
import {brushX, brushSelection} from 'd3-brush';


import {event, selection, select, selectAll, mouse} from 'd3-selection';
import {transition} from 'd3-transition';

// hijack selection
selection.prototype.dropdown = function () {
    new Dropdown();
    return this;
};

function attrsFunction(s, map) {
    return s.each(function () {
        var x = map.apply(this, arguments), s = select(this);
        for (var name in x) s.attr(name, x[name]);
    });
}

function attrsObject(s, map) {
    for (var name in map) s.attr(name, map[name]);
    return s;
}

function propertiesFunction(s, map) {
    return s.each(function () {
        var x = map.apply(this, arguments), s = select(this);
        for (var name in x) s.property(name, x[name]);
    });
}

function propertiesObject(s, map) {
    for (var name in map) s.property(name, map[name]);
    return s;
}

function classesFunction(s, map) {
    return s.each(function () {
        var x = map.apply(this, arguments), s = select(this);
        for (var name in x) s.classed(name, x[name]);
    });
}

function classesObject(s, map) {
    for (var name in map) s.classed(name, map[name]);
    return s;
}

function stylesFunction(s, map, priority) {
    return s.each(function () {
        var x = map.apply(this, arguments), s = select(this);
        for (var name in x) s.style(name, x[name], priority);
    });
}

function stylesObject(s, map, priority) {
    for (var name in map) s.style(name, map[name], priority);
    return s;
}
//more selection hijacking.
selection.prototype.attrs = function (map) {
    return (typeof map === "function" ? attrsFunction : attrsObject)(this, map);
};

//more selection hijacking.
selection.prototype.properties = function (map) {
    return (typeof map === "function" ? propertiesFunction : propertiesObject)(this, map);
};

//more selection hijacking.
selection.prototype.styles = function (map, priority) {
    return (typeof map === "function" ? stylesFunction : stylesObject)(this, map, priority == null ? "" : priority);
};

selection.prototype.classes = function (map) {
    return (typeof map === "function" ? classesFunction : classesObject)(this, map);
};

Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max);
};


Number.prototype.map = function (in_min, in_max, out_min, out_max) {
    if (this > in_max) {
        return out_max;
    }
    if (out_max < out_min) {
        return (( this - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min).clamp(out_max, out_min);
    } else {
        return (( this - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min).clamp(out_min, out_max);
    }
};

var isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);

var NaNify = (n) => isNumeric(n) ? parseFloat(n) : NaN;

var isDefined = (v) => (typeof v !== 'undefined');

var inArray = (value, array) => array.indexOf(value) > -1;

var initLog = () => {
    if (!window.console) window.console = {};
    window.console.log = window.console.log || function () {
        };
    window.console.warn = window.console.warn || function () {
        };
    window.console.error = window.console.error || function () {
        };
    window.console.info = window.console.info || function () {
        };
};

export function TimePlayer(options) {
    initLog();

    if (!isDefined(options)) {
        console.error("No options provided....");
        return;
    }

    if (!isDefined(options.url) && !isDefined(options.jsonString) && !isDefined(options.data)) {
        console.error("No data source in options...");
        return;
    }

    this.gradientData = [];
    this.errorData = {};
    this.errorData_swap = {};
    this.gradientData_swap = [];

    this.default_image = null;
    this.numTimePoints = 0;
    this.imageLoadQueueLength = 5;
    this.compositeOperation = "source-over";
    this.selector = "#timeplayer-9000";
    this.snapping = "None";
    this.playing = false;
    this.period = 300;
    this.preloadAmount = 100;
    this.currentFrameIndex = 5;
    this.height = 240;
    this.width = 640;
    this.hires = false;
    this.speedMultiplier = 3600;
    this.autoPlay = false;
    this.humanFormat = "YYYY-MM-DD HH:mm";
    this.timestreamParse = "YYYY_MM_DD_HH_mm_ss_00";
    this.timestreamFormat = "[webroot]/YYYY/YYYY_MM/YYYY_MM_DD/YYYY_MM_DD_HH/[filename]_YYYY_MM_DD_HH_mm_ss_00.[extension]";

    var data = [],
        // progressBar = new ProgressBar(),
        reasonableMaxNumTimePoints = 365 * 24 * Math.pow(60, 2) / 600,
        overlays = [],
        originalExtent = [];


    var dimensions = {
        timelineWidth: window.innerWidth,
        timelineHeight: 110,
        axisHeight: 34,
        iconSize: 20
    };

    this.loaded = false;
    dimensions.bottomHeight = (dimensions.timelineHeight / 2) - dimensions.axisHeight;
    dimensions.topHeight = dimensions.bottomHeight;
    dimensions.topAxisY = 0;
    dimensions.botAxisY = dimensions.timelineHeight - dimensions.axisHeight;
    dimensions.botY = dimensions.botAxisY - dimensions.bottomHeight;
    dimensions.topY = dimensions.botY - dimensions.topHeight;
    // parse player options
    var parseOpts = (opts)=> {
        for (let key in opts) {
            if (opts.hasOwnProperty(key)) this[key] = opts[key];
        }
    };

    parseOpts(options);

    var getRemainingHeight = (selector) => {
        var s = (!selector) ? select(this.selector).node(): select(selector).node();
        if (typeof s !== 'object' || s == null) return window.innerHeight;
        // if (this.height > remainingHeight) remainingHeight = this.height + dimensions.timelineHeight;
        // return jQuery(window).height() - (s.getBoundingClientRect().top);
        var h = window.innerHeight - (s.getBoundingClientRect().top);
        return Math.max(480, h);
    };

    var osdHeight = () => getRemainingHeight() - 10;// - (dimensions.timelineHeight + (dimensions.axisHeight * 2));

    jQuery("<div id='openseadragon-viewer'></div>")
        .css("height", "" + osdHeight() + "px")
        .css("width", "100%")
        .appendTo(this.selector);

    jQuery(".panel").css({"margin-bottom": 0, "background-color": "black"});

    this.viewer = OpenSeadragon({
        id: 'openseadragon-viewer',
        overlays: overlays,
        tileSources: [],
        sequenceMode: true,
        preserveViewport: true,
        autoHideControls: false, // do this manually for more fine-grained control

        blendTime: 0.25,
        alwaysBlend: false,
        compositeOperation: this.compositeOperation,
        showNavigationControl: false,
        showSequenceControl: false,
        immediateRender: true,
        prefixUrl: "/static/img/openseadragon/",
        maxImageCacheCount: 100000,
        imageLoaderLimit: this.preloadAmount,
        zoomPerClick: 1.0,
        //crossOriginPolicy:"Anonymous",
        smoothTileEdgesMinZoom: "Infinity",
        maxZoomPixelRatio: "Infinity"
    });
    var loadQueueLength = () => this.imageLoadQueueLength;
    this.viewer._cancelPendingImages = function () {
        /**
         * Override the this.viewers pending image cancellation as it is too aggressive.
         */
        if (this._loadQueue.length > loadQueueLength) {
            this._loadQueue = this._loadQueue.slice(this._loadQueue.length - (loadQueueLength()), this._loadQueue.length - 1);
            console.log(this._loadQueue[this._loadQueue.length - 1])
        }

        // normally this does this
        // this._loadQueue = [];
        // unfortunately, this means that during scrubbing, the player will wait until it has fully leaded

        // if (this._loadQueue.length) {
        //     console.log("Cancelled Pending images.",this._loadQueue.length)
        // }
    };

    function getOverlayObject(viewer, overlay) {
        /**
         * need to provide an implementation of this for the open override to work correctly as the implementation
         * within OpenSeadragon is private.
         */
        if (overlay instanceof OpenSeadragon.Overlay) {
            return overlay;
        }

        var element = null;
        if (overlay.element) {
            element = OpenSeadragon.getElement(overlay.element);
        } else {
            var id = overlay.id ?
                overlay.id :
            "openseadragon-overlay-" + Math.floor(Math.random() * 10000000);

            element = OpenSeadragon.getElement(overlay.id);
            if (!element) {
                element = document.createElement("a");
                element.href = "#/overlay/" + id;
            }
            element.id = id;
            OpenSeadragon.addClass(element, overlay.className ?
                overlay.className :
                "openseadragon-overlay"
            );
        }

        var location = overlay.location;
        var width = overlay.width;
        var height = overlay.height;
        if (!location) {
            var x = overlay.x;
            var y = overlay.y;
            if (overlay.px !== undefined) {
                var rect = viewer.viewport.imageToViewportRectangle(new OpenSeadragon.Rect(
                    overlay.px,
                    overlay.py,
                    width || 0,
                    height || 0));
                x = rect.x;
                y = rect.y;
                width = width !== undefined ? rect.width : undefined;
                height = height !== undefined ? rect.height : undefined;
            }
            location = new OpenSeadragon.Point(x, y);
        }

        var placement = overlay.placement;
        if (placement && OpenSeadragon.type(placement) === "string") {
            placement = OpenSeadragon.Placement[overlay.placement.toUpperCase()];
        }

        return new OpenSeadragon.Overlay({
            element: element,
            location: location,
            placement: placement,
            onDraw: overlay.onDraw,
            checkResize: overlay.checkResize,
            width: width,
            height: height,
            rotationMode: overlay.rotationMode
        });
    }

    this.viewer.open = function (tileSource) {
        /**
         * Override the this.viewer open method to allow the this.viewer to store (and blend) more images.
         */
        if (!tileSource) {
            return;
        }

        this._opening = true;

        var failEvent;

        var options = {
            tileSource: tileSource
        };

        var originalSuccess = options.success;

        options.success = (event) => {
            if (originalSuccess) {
                originalSuccess(event);
            }
            if (this._firstOpen) {
                this.viewport.goHome(true);
                this.viewport.update();
            }

            this._firstOpen = false;
            this._drawOverlays();

            this.raiseEvent('open', {source: tileSource});
            this._opening = false;
        };

        var originalError = options.error;
        options.error = (event) => {

            if (!failEvent) {
                failEvent = event;
            }

            if (originalError) {
                originalError(event);
            }
            this.raiseEvent('open-failed', failEvent);
            this._opening = false;
        };
        // this is the bit which was changed to allow better queueing.
        var t = timer(() => {
            if (this.world._items.length > 2 && this.world._items[1]._hasOpaqueTile) {
                this.world._items.shift().destroy();
                if ( this.world._items[1]._hasOpaqueTile) t.stop();
            }
        });
        this.addTiledImage(options);

        return this;
    };

    this.viewer.goToPage = function (page) {
        /**
         * Overriding this method to  allow replacing parts of a url for a tilesource on access.
         * This means we only need to store a single tilesource within openseadragon and give it a method of
         * calculating the correct url.
         */
        this._sequenceIndex = page;
        this.open({url: this.tileSources[0].userData.getUrl(page), type: "image"});
        return this;
    };

    this.viewer.isPageLoaded = function (page) {
        /**
         * returns whether an image has been loaded or not.
         * This is important becausewe arent using static url paths.
         * @type {Boolean} - Whether the page (tileSource) is loaded.
         */
        var test = document.createElement("img");
        test.src = this.tileSources[0].userData.getUrl(page);
        return test.complete || test.width + test.height > 0;
    };

    //remove handlers for open failed because it does weird stuff...
    this.viewer.removeAllHandlers('open-failed');
    this.viewer.removeAllHandlers('open');

    // //these are apparently really really slow...
    this.viewer.addHandler('open-failed', (event) => {
        /**
         * Bind event for open-failed.
         */
        addErrorForUrl(event.source.url);
        // old method of determining the correct image to flag with error.
        // if (this.currentFrameIndex == event.eventSource._sequenceIndex)
        //     addErrorAtIndex(event.eventSource._sequenceIndex);
        // console.log(errorData);
    });


    /*
     UI BUTTON DATAS & HELPERS
     */
    var glyphiconDefaultClass = (d)=> "glyphicon " + d.glyphicon;
    var glyphiconWaitClass = (d)=> "glyphicon " + d.glyphiconWait || d.glyphicon;

    var playControlsButtonsData = {
        playButton: {
            id: "play-button",
            title: "Preload and Play",
            octicon: octicons.triangleright,
            octiconWait: octicons.watch,
            clickedCallback: (d)=> {
                console.log("Speed: ",this.speedMultiplier);
                this.playing = !this.playing;
                updatePlayState();
            }
        },
        omniPreloadButton: {
            id: "omnipreload-button",
            title: "Preload",
            octicon: octicons.zap,
            octiconWait: octicons.watch,
            clickedCallback: (d)=> {
                this.playing = false;
                preloadOmni();
            }
        },
        fullscreenButton: {
            id: "fullscreen-button",
            title: "Toggle Fullscreen",
            octicon: octicons.screennormal,
            octiconWait: octicons.screenfull,
            clickedCallback: ()=> {
                var isFullscreen = !this.viewer.isFullPage();
                this.viewer.setFullScreen(isFullscreen);
            }
        }
    };
    var hiresButton = {
        id: "hires-button",
        title: "Toggle High Resolution",
        octicon: octicons.unfold,
        octiconWait: octicons.fold,
        clickedCallback: (d)=> {
            this.hires = !this.hires;

            [this.gradientData_swap, this.gradientData, this.errorData_swap, this.errorData] = [this.gradientData, this.gradientData_swap, this.errorData, this.errorData_swap];

        var s1 = this.botLineGradientStops.data(this.gradientData, (d) => d.index);
        var s2 = this.topLineGradientStops.data(this.gradientData, (d) => d.index);

        s1.enter()
            .append("stop")
            .attrs({
                "d": (d)=>d.index,
                "offset": (d) => this.offsetScale(d.index),
                "stop-color": (d) => this.colorSelect(this.name),
                "stop-opacity": 0.3
            });

        s2.enter()
            .append("stop")
            .attrs({
                "d": (d)=>d.index,
                "offset": (d) => this.offsetScale(d.index),
                "stop-color": (d) => this.colorSelect(this.name),
                "stop-opacity": 0.3
            });

        s1.exit().remove();
        s2.exit().remove();

        this.botLineGradientStops = this.botLineGradient.selectAll("stop");
        this.topLineGradientStops = this.topLineGradient.selectAll("stop");
        this.topLineGradientStops.sort((a, b) => ascending(a.index, b.index));
        this.botLineGradientStops.sort((a, b) => ascending(a.index, b.index));
        redrawPaths();
        updateAxisScales();
        updateGradients();
            updatePlayer(this.currentFrameIndex + 1);
        }
    };
    var snapButtonData = {
        id: "snap-button",
        title: "Time span snapping",
        choices: map({
            Hour: time.timeHour,
            Day: time.timeDay,
            Week: time.timeWeek,
            Month: time.timeMonth,
            Year: time.timeYear,
            None: "None"
        }),
        clickedCallback: (d)=> {
            var idx = d.choices.keys().indexOf(this.snapping);

            var [x0, x1] = brushSelection(this.bottomBrushGroup.node());

            if (idx == 0) originalExtent = [x0, x1];

            var target = (idx + 1) % d.choices.size();
            if (target < 0) target += d.choices.size();
            this.snapping = d.choices.keys()[target];

            select(event.srcElement).text(this.snapping);
            if (this.snapping == "None")
                this.bottomBrushGroup.transition()
                    .call(this.bottomBrush.move, originalExtent);
            else
                snapTo(this.snapping);
        }
    };

    var shareDropdownData = {
        id: "share-dropdown-button",
        title: "",
        octicon: octicons.linkexternal,
        subButtons: {
            copyLink: {
                id: "copylink-button",
                title: "Copy link to clipboard",
                octicon: octicons.clippy,
                clickedCallback: ()=>copyToClipboard(getURLParamsForCopy())
            },
            embedLink: {
                id: "embedlink-button",
                title: "Copy embed code to clipboard",
                octicon: octicons.pin,
                clickedCallback: ()=>copyToClipboard(getEmbedTag())
            },
            downloadImg: {
                id: "downloadimg-button",
                title: "Download the current image",
                octicon: octicons.filemedia,
                clickedCallback: ()=>console.log(getDownloadImg())
            },
            downloadJson: {
                id: "downloadjson-button",
                title: "Download a copy of this timestreams json data",
                octicon: octicons.filecode,
                clickedCallback: ()=>console.log(getDownloadJson())
            }
        }
    };

    var updateSpeedSliderTooltips = () => {
        var speed = this.speedMultiplier;
        var value = speed + "x normal speed";
        if (speed == 3600) value = "1 hour per second";
        else if (speed == 10080) value = "1 week per minute";
        else if (speed == 43200) value = "1 month per minute";
        jQuery("." + speedSliderData.id).attr("title", value);
    };

    var speedSliderData = {
        id: "timeplayer-speed-slider",
        title: "Realtime speed multiplier",
        min: 300,
        max: 100000,
        value: 3600,
        changeCallback: (d)=> {
            var sourceEle = event.target;
            var speed = sourceEle.value;
            this.speedMultiplier = parseFloat(speed);
            console.log(speed);
            updateSpeedSliderTooltips();
        },
        detents: [
            3600,
            10080,
            43200
        ]
    };

    this.mapObj = {
        "webroot": null,
        "filename": null,
        "webroot_hires": null,
        "filename_hires": null,
        "extension": null
    };

    this.replaceUrl = (input_data) => {
        return input_data.replace(/webroot|filename|extension/gi, (match) => {
            if (match == 'webroot' && this.hires) match = "webroot_hires";
            if (match == 'filename' && this.hires) match = "filename_hires";
            return this.mapObj[match];
        });
    };

    var estimateTimelineData = (optionData, callback) => {
        /**
         * Estimates (pretty well), configuration data for a timelapse, and then calls the second parameter when
         * complete.
         * the parameter optionData must follow this spec:
         * it creates values from these possible fields in this order:
         * 'name'           - name, ts_id or ts_name
         * 'period'         - period, period_in_milliseconds, period_in_seconds, period_in_minutes, or period_in_hours
         * 'webroot'        - webroot or webroot_hires
         * 'start'          - ts_start, start_datetime or posix_start
         * 'end'            - ts_end, end_datetime or posix_end (technically optional)
         * 'default_image'  - default_image, thumbnail or thumbnails[0]
         * 'extension'      - image_type
         *
         * 'start' and 'end' the datetime formats have the following rules:
         *  - ts_start and ts_end must be in the format provided by timestreamParse (default: YYYY_MM_DD_HH_mm_ss_00)
         *  - start_datetime and end_datetime must be in an iso8601 or similar string format (interpreted by moment.js).
         *  - posix_start and posix_end must be posix time (seconds since Jan 1 1970), as a string, integer or float.
         *  - if end isn't provided, cannot be parsed or is the string literal "now" it will be set to the current time.
         *
         * 'extension' is used to calculate the path of images correctly and is CasE SenSitIVe!
         *
         * 'webroot' must be a path to the root of the timelapse, it is by default used in this format:
         *      [webroot]/YYYY/YYYY_MM/YYYY_MM_DD/YYYY_MM_DD_HH/[filename]_YYYY_MM_DD_HH_mm_ss_00.[extension]
         *  if 'webroot_hires' is provided, it will be used as a high resolution source for images, otherwise
         *  we will try and replace the width in the filename with 'fullres'
         *
         * 'default_image' determines the first image to be displayed.
         *
         *
         * @param {object} optionData - configuration data object with valid fields.
         * @param {function} callback - callback function,
         */
        if (typeof callback !== "function") callback = ()=> {
        };
        console.log("Estimating timeline data for ", optionData);

        var start, end;
        if (isDefined(optionData.period)) optionData.period = optionData.period * 1;
        else if (isDefined(optionData.period_in_milliseconds)) optionData.period = optionData.period_in_milliseconds / 1000;
        else if (isDefined(optionData.period_in_seconds)) optionData.period = optionData.period_in_seconds;
        else if (isDefined(optionData.period_in_minutes)) optionData.period = optionData.period_in_minutes * 60;
        else if (isDefined(optionData.period_in_hours)) optionData.period = optionData.period_in_hours * 3600;
        else console.error("FATAL ERROR! No interval/period for timelapse! How many images per second?!?!?");

        optionData.name = optionData.name || optionData.ts_id || optionData.ts_name;
        select(".timeplayer-heading").text(optionData.name);

        if (!isDefined(optionData.default_image)) {
            if (isDefined(optionData.thumbnail)) optionData.default_image = optionData.thumbnail;
            else if (Array.isArray(optionData.thumbnails)) optionData.default_image = optionData.thumbnails[0];
            else console.warn("No default_image or thumbnail parameters in the option data, you wont have a default image. \n(Probably should check up on this btw...");
        }

        if (!isDefined(optionData.webroot) && !isDefined(optionData.webroot_hires)) {
            // bootbox.alert("No webroot was provided for this timestream.");
            console.error("FATAL ERROR! No webroot! Where are my images?!?!?");
        }


        // fixes double slashes and removes trailing slash
        var fixSlashes = (v) => typeof v === "string" ? v.replace(/([^:])\/\/+/g, "$1/").replace(/\/+$/, "") : v;
        optionData.webroot_hires = fixSlashes(optionData.webroot_hires);
        // assign webroot to webroot_hires if webroot isnt defined.
        optionData.webroot = isDefined(optionData.webroot) ? fixSlashes(optionData.webroot) : optionData.webroot_hires;
        if (typeof optionData.webroot_hires === "string") playControlsButtonsData.hiresButton = hiresButton;

        // get start date
        if (isDefined(optionData.ts_start)) {
            try {
                optionData.start = moment(optionData.ts_start, this.timestreamParse);
            } catch (err) {
                console.warn("Error parsing start to machine readable time (ts_start), check input data.", err)
            }
        }
        if (isDefined(optionData.start_datetime)) {
            try {
                optionData.start = moment(optionData.start_datetime);
            } catch (err) {
                console.warn("Error parsing start to machine readable time (start_datetime), check input data.", err)
            }
        }
        if (isDefined(optionData.posix_start)) {
            try {
                optionData.start = moment.unix(parseFloat(optionData.posix_start));
            } catch (err) {
                console.warn("Error parsing start to machine readable time (posix_start), check input data.", err)
            }
        }
        if (!isDefined(optionData.start)) {
            // bootbox.alert("Couldnt interpret start date from input data. This will fail horribly...");
            console.error("Couldnt interpret start date from input data. This will fail horribly...");
        }

        // get end date


        if (isDefined(optionData.ts_end)) {
            if (optionData.ts_end == "now") {
                optionData.end = moment();
            } else {
                try {
                    optionData.end = moment(optionData.ts_end, this.timestreamParse);
                } catch (err) {
                    console.warn("Error parsing end to machine readable time (ts_end), check input data.", err)
                }
            }
        }
        if (isDefined(optionData.end_datetime)) {
            if (optionData.end_datetime == "now") {
                optionData.end = moment();
            } else {
                try {
                    optionData.end = moment(optionData.end_datetime);
                } catch (err) {
                    console.warn("Error parsing end to machine readable time (end_datetime), check input data.", err)
                }
            }
        }
        if (isDefined(optionData.posix_end)) {
            if (optionData.posix_end == "now") {
                optionData.end = moment();
            } else {
                try {
                    optionData.end = moment.unix(parseFloat(optionData.posix_end));
                } catch (err) {
                    console.warn("Error parsing end to machine readable time (posix_end), check input data.", err)
                }
            }
        }

        if (!isDefined(optionData.end)) console.warn("Couldnt interpret end date from input data falling back to now.");
        optionData.end = optionData.ongoing ? moment() : optionData.end || moment();
        optionData.start = optionData.start.startOf('day');
        optionData.start = optionData.start.subtract(1, 'day').startOf('day').add(12, 'hours');
        optionData.end = optionData.end.add(1, 'day').startOf('day').add(12, 'hours');

        var rangeStr = "Start: " + optionData.start.format(this.humanFormat) + "\n End: " + optionData.end.format(this.humanFormat);
        jQuery("#timeplayer-datetime-info").attr('title', rangeStr);

        var getFilename = (fn, wr) => isDefined(fn) ? fn : wr.split("/").pop();

        this.mapObj = {
            "webroot": optionData.webroot,
            "filename": getFilename(optionData.filename, optionData.webroot),
            "webroot_hires": optionData.webroot_hires,
            "filename_hires": getFilename(optionData.filename_hires, optionData.webroot_hires),
            "extension": optionData.image_type
        };


        this.numTimePoints = Math.floor(moment.duration(optionData.end.diff(optionData.start)).asSeconds() / optionData.period);

        if (this.numTimePoints > reasonableMaxNumTimePoints) {
            var message = "Warning, This timestream might have a large number of images.<br>" +
                "It has " + 3600 / optionData.period + " images per hour for " + Math.floor(moment.duration(optionData.end.diff(optionData.start)).asYears()) + " years total<br>" +
                "This can cause instability.<br>" +
                "Start: " + optionData.start.format(this.timestreamParse) + "<br>" +
                "End:   " + optionData.end.format(this.timestreamParse);
            // bootbox.alert(message);
        }

        if (optionData.currentFrameIndex === null) {
            optionData.currentFrameIndex = Math.floor(this.numTimePoints / 2);
        }
        this.viewer.tileSources = [{
            userData: {
                getUrl: (index) => this.replaceUrl(moment(this.timeToIndex.invert(index)).format(this.timestreamFormat))
            }
        }];
        parseOpts(optionData);

        callback();

        return optionData
    };


    if (isDefined(options.url)) {
        var callback = (err, data) => estimateTimelineData(data, constructTimeline);

        if (options.url.split("?")[0].endsWith("json")) {
            json(options.url, callback);
        } else if (options.url.includes("xml")) {
            xml(options.url, (err, data)=> {
                var timestreamConf = timecamFormatToTimestreamFormat(xmlToJson(data));
                estimateTimelineData(timestreamConf, constructTimeline);
            });
        } else {
            console.error("malformed url (supporting .json and .jsonp)");
            return;
        }
    }
    if (isDefined(options.jsonString)) {
        estimateTimelineData(JSON.parse(options.jsonString), constructTimeline);
    }


    var initUI = (selector)=> {
        /**
         * initialises the user interface with the given selector.
         * @param {string} selector - The target selector for the ui to fill. (ie "#timeplayer-control-container"
         */

        select(selector).style("background-color", options.backgroundColor || "black");

        // definee some useful groupings of attributes, classes and their respective values and anonymous functions
        selection.prototype.visibleMobile = function (mobile) {
            return this.classes({
                "hidden-sm-up": mobile,
                "hidden-xs-down": !mobile
            });
        };

        selection.prototype.makeButton = function () {
            return this.classes({"btn": true, "btn-default": true});
        };

        selection.prototype.makeTooltip = function () {
            return this.attrs({
                "id": (d)=>d.id,
                "title": (d) => d.title
            });
        };

        selection.prototype.appendOcticon = function () {
            return this.each(function (d){
                d.octicon.appendToSelection(select(this), {width: dimensions.iconSize, height: dimensions.iconSize});
            });
        };

        selection.prototype.setIcon = function (wait) {
            if (!this.datum().octiconWait) {
                console.log("No wait for icon.");
                return this;
            }
            if( typeof wait === 'undefined'){
                console.log("no value, toggle icon");
                wait = this.select("svg").classed("octicon-"+this.datum().octicon.symbol);
            }
            var target = wait ? this.datum().octiconWait : this.datum().octicon;
            return this.call(() => {
                this.selectAll("*").remove();
                // d.html(target.toSVG({width: dimensions.iconSize, height: dimensions.iconSize}));
                target.appendToSelection(this, {width: dimensions.iconSize, height: dimensions.iconSize});
            });
        };

        selection.prototype.rangeSliderAttrs = function () {
            return this.attrs({
                "value": (d) => d.value,
                "max": (d) => d.max,
                "min": (d) => d.min,
                "list": (d) => d.id + "-detents",
                "title": (d) => d.title,
                "class": (d) => d.id
            });
        };

        this.controlsRootEle = select(selector)
            .append("div").attr("id", "timeplayer-controls")
            .styles({
                "width": "100%",
                "position": "absolute",
                "bottom": 0
            })
            .append("div")
            .classed("col-md-12", true);

        if (osdHeight() > 480) {
            this.controlsRootEle.on("mouseenter", (d)=> {
                this.controlsRootEle.transition()
                    .duration(500)
                    .style("opacity", 1.0)
            })
                .on("mouseleave", (d)=> {
                    this.controlsRootEle.transition()
                        .delay(500)
                        .duration(3000)
                        .style("opacity", 0.365);
                });
        }


        var timeplayerControlsRow = this.controlsRootEle
            .append("div").attr("id", "timeplayer-controls-row")
            .append("div").classed("form-inline", true);

        var visibleDesktopDiv = timeplayerControlsRow.append("div")
            .visibleMobile(false);

        visibleDesktopDiv.selectAll()
            .data(values(playControlsButtonsData)).enter()
            .append("div").classed("form-group", true)
            .styles({
                "display": 'inline-block',
                "margin": "5px 3px"
            })
            .append("button")
            .makeButton()
            .makeTooltip()
            .property("type", "button")
            .appendOcticon()
            .on("click.toggle",function(){
                select(this).setIcon();
            })
            .on("click.cb", (d)=>d.clickedCallback(d));

        // TODO: snap button is super broken.
        // var snapButton = visibleDesktopDiv.selectAll()
        //     .data([snapButtonData]).enter()
        //     .append("div")
        //     .classes({"form-group": true, "dropup": true})
        //     .styles({
        //         "display": 'inline-block',
        //         "margin": "5px 3px"
        //     })
        //     .append("button")
        //     .makeButton().makeTooltip()
        //     .on("click", (d)=>d.clickedCallback(d))
        //     .property("type", "button").text("None");

        var dropDownMenus = visibleDesktopDiv.selectAll()
            .data([shareDropdownData]).enter()
            .append("div")
            .classes({
                "form-group": true,
                "dropup": true
            })
            .styles({
                "display": 'inline-block',
                "margin": "5px 3px"
            });

        var ddbutton = dropDownMenus
            .append("button")
            .makeButton().makeTooltip()
            .attr("data-toggle", 'dropdown')
            .property("type", "button")
            .dropdown()
            .appendOcticon();

        dropDownMenus
            .append("ul").classed("dropdown-menu", true)
            .styles({
                "min-width": 0,
                "background-color": "transparent",
                "padding": 0,
                "left": "-4px"
            })
            .selectAll()
            .data((d)=>values(d.subButtons)).enter()
            .append("li")
            .append("div").classed("form-group", true)
            .styles({
                "display": 'inline-block',
                "margin": "5px 3px"
            })
            .append("button")
            .makeButton().makeTooltip()
            .on("click", (d)=>d.clickedCallback(d))
            .attrs({
                "data-placement": "right",
                "role": "menuitem",
                "tabindex": "-1"
            })
            .appendOcticon();


        var rangeSliderDiv = visibleDesktopDiv.selectAll()
            .data([speedSliderData]).enter()
            .append("div").classed("form-group", true)
            .styles({
                "display": 'inline-block',
                "margin": "5px 3px"
            });

        rangeSliderDiv
            .append("input")
            .styles({
                "min-width": "100px",
                "display": 'inline-block'
            })
            .attr("id", (d)=>d.id)
            .rangeSliderAttrs()
            .classed("form-control", true)
            .property("type", "range")
            .on("change", (d)=>d.changeCallback(d));

        rangeSliderDiv
            .append("datalist")
            .attr("id", (d)=>d.id + "-detents")
            .selectAll().data((d)=>d.detents).enter()
            .append("option").attr("value", (d)=>d);

        // buttons and sliders that are only visible on mobile
        var mobileVisibleDiv = timeplayerControlsRow.append("div")
            .visibleMobile(true)
            .style("display", "flex");

        mobileVisibleDiv.selectAll()
            .data(values(playControlsButtonsData)).enter()
            .append("div").classed("form-group", true).style("display", "inline-block")
            .append("button")
            .makeButton().makeTooltip()
            .attr("id", (d)=>d.id + "-sm")
            .property("type", "button")
            .on("click", (d)=>d.clickedCallback(d))
            .appendOcticon();

        // add mobile slider.
        mobileVisibleDiv.selectAll()
            .data([speedSliderData]).enter()
            .append("div").classed("form-group", true)
            .styles({
                "display": 'inline-block',
                "width": "100%"
            })
            .append("input").rangeSliderAttrs()
            .classed("form-control", true)
            .styles({
                "min-width": "100px",
                "width": "100%"
            })
            .on("change", (d)=>d.changeCallback(d))
            .property("type", "range");

        visibleDesktopDiv
            .append("div").classed("float-xs-right", true)
            .append("div").classed("form-group", true)
            .styles({
                "display": 'inline-block',
                "margin": "5px 3px"
            })
            .append("abbr")
            .styles({
                "max-width": "1024px",
                "min-width": "100px",
                "margin": "14px",
                "background-color": "white",
                "opacity": 0.95,
                "border-radius": "3px"
            })
            .attr("id", "timeplayer-datetime-info");

        this.timeplayerTimelineEle = this.controlsRootEle
            .append("div").attr("id", "timeplayer-timeline-row").style("margin-bottom", 0)
            .append("div").attr("id", "timeplayer-timeline")
            .styles({
                "margin-bottom": "10px",
                "background-color": "white",
                "opacity": .85
            })
            .classes({
                "panel": true,
                "panel-default": true
            });
        this.viewer.addControl("timeplayer-controls", {anchor: OpenSeadragon.ControlAnchor.NONE});

    };


    // this.viewer.addControl("timeplayer-controls", {anchor: OpenSeadragon.ControlAnchor.NONE});

    var addErrorAtIndex = (index)=> {
        /**
         * adds an error to the error data at the specified index
         * @param {number} index - index to add an error at
         */
        this.errorData[index] = {error: true};
        // q.defer(updateGradients);
        updateGradients();
        updateSliderColors(this.currentFrameIndex)
    };
    var addSuccessAtIndex = (index) => {
        /**
         * adds a successful image load to the error data at the specified index
         * @param {number} index - index to add a success at
         */
        this.errorData[index] = {error: false};
        // q.defer(updateGradients);
        updateGradients();
        updateSliderColors(this.currentFrameIndex)

    };
    var clearAtIndex = (index) => {
        /**
         * Removes all error data at a specific index.
         * this includes any information about whether the image has been loaded.
         * @param {number} index - index to remove all errordata at.
         */
        delete this.errorData[index];
        // q.defer(updateGradients);
        updateGradients();
        updateSliderColors(this.currentFrameIndex)
    };
    var addErrorForUrl = (url)=> {
        /**
         * the same as "addErrorAtIndex" however accepts a url that is a tilesource for the this.viewer.
         * This is a helper function to map back from image load failed events to meaningful time data to mark the
         * gradients.
         * @param {string} - url to add an error at
         */
        var m = moment(url, this.replaceUrl(this.timestreamFormat));
        addErrorAtIndex(this.timeToIndex(m.toDate()));
    };
    var addSuccessForUrl = (url) => {
        /**
         * the same as "addErrorForUrl" except that it adds a successful load instead of an error
         * @param {string} - url to add a success at
         */
        var m = moment(url, this.replaceUrl(this.timestreamFormat));
        addSuccessAtIndex(this.timeToIndex(m.toDate()));
    };
    var preloadOmni = () => {
        /**
         * Triggers preload of the images at the current time resolution ordered from the time cursor out.
         * Uses timer() to await the jobs so as to not block the browser.
         */

        var [x0, x1] = brushSelection(this.bottomBrushGroup.node());
        var [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);

        this.loaded = false;
        reloadTimeresTicks();

        var imagesToLoad = this.scaleToPreloadTicks.map((d, i) => {
            var idx = this.timeToIndex(d);
            return {
                datetime: d,
                url: this.viewer.tileSources[0].userData.getUrl(idx),
                index: this.timeToIndex(this.scaleToPreload.invert(i))
            };
        });

        var middleMoment = moment(this.timeToIndex.invert(this.currentFrameIndex));

        imagesToLoad.sort(function (a, b) {
            return Math.abs(moment(a.datetime).diff(middleMoment)) - Math.abs(moment(b.datetime).diff(middleMoment));
        });
        // var currentLevel = this.viewer.viewport.viewportToImageZoom(this.viewer.viewport.getZoom())<0.5?0:1;
        imagesToLoad.forEach((d) => {
            this.viewer.imageLoader.addJob({
                // src: d.levels[currentLevel].url,
                src: d.url,
                crossOriginPolicy: false,
                callback: (img, message) => {
                    if (message) console.log(message);
                    if (img) addSuccessAtIndex(this.timeToIndex(d.datetime));
                    else addErrorAtIndex(this.timeToIndex(d.datetime));
                }
            });
        });

        var t = timer(() => {
            select("#loadingStop").attr("offset", () => {
                return Math.floor((this.viewer.imageLoader.jobsInProgress / this.preloadAmount) * 100) + "%";
            });
            if (this.viewer.imageLoader.jobsInProgress === 0) {
                this.loaded = true;
                select("#" + playControlsButtonsData.omniPreloadButton.id).setIcon(false);
            }
            if(this.loaded) t.stop();
        });

    };
    var preloadOne = (index) => {
        /**
         * preloads a single image at the index specified
         * @param {number} index - index to load.
         */
        // var currentLevel = this.viewer.viewport.viewportToImageZoom(this.viewer.viewport.getZoom())<0.5?0:1;
        this.viewer.imageLoader.addJob({
            // src: data[index].levels[currentLevel].url,
            src: this.viewer.tileSources[0].userData.getUrl(index),
            crossOriginPolicy: false,
            callback: function (img, message) {
                if (message) console.log(message);
                if (img) addSuccessAtIndex(index);
                else addErrorAtIndex(index);
            }
        });
    };
    var preloadForward = () => {
        /**
         * preloads all the images currently in the selected range from the beginning, as opposed to loading from the
         * current location of the time cursor
         */
        this.loaded = false;
        reloadTimeresTicks();
        // var currentLevel = this.viewer.viewport.viewportToImageZoom(this.viewer.viewport.getZoom()) < 0.5 ? 0 : 1;
        var imagesToLoad = this.scaleToPreloadTicks.map((d, i) => {
            var idx = this.timeToIndex(d);
            return {
                datetime: d,
                url: this.viewer.tileSources[0].userData.getUrl(idx),
                index: this.timeToIndex(this.scaleToPreload.invert(i))
            };
        });
        imagesToLoad.forEach((d) => {
            this.viewer.imageLoader.addJob({
                // src: d.levels[currentLevel].url,
                src: d.url,
                crossOriginPolicy: false,
                callback: (img, message) => {
                    if (message) console.log(message);
                    if (img) addSuccessAtIndex(this.timeToIndex(d.datetime));
                    else addErrorAtIndex(this.timeToIndex(d.datetime));
                }
            });
        });

        var t = timer(() => {
            select("#loadingStop").attr("offset", () => {
                return Math.floor((this.viewer.imageLoader.jobsInProgress / this.preloadAmount) * 100) + "%";
            });
            if (this.viewer.imageLoader.jobsInProgress === 0) {
                this.loaded = true;
            }
            if(this.loaded) t.stop();
        });
    };
    var frameChange = (index) => {
        /**
         * makes the this.viewer change frame.
         * wont attempt to change to a frame that is known to be non-existent
         * @param {number} index - index of the target frame.
         */
        if (!isDefined(this.errorData[index]) || !this.errorData[index].error)
            this.viewer.goToPage(index);
    };
    var beginPlay = (index) => {
        /**
         * begins playing from the index provided.
         * @param {number} index - index of the frame to start from.
         */
        var last = 0;
        console.log("play");
        var [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);
        var diffamt = Math.abs(moment(minExtent).diff(moment(maxExtent)));
        var lastTime = this.timeToIndex.invert(index);
        updatePlayer(lastTime);

        var t = timer((elapsed) => {
            var [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
                [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);
            if (x0 == x1) extents = [0, this.timeToIndex(this.end)];

            // var startAdd = startingFrame < extents[0] || startingFrame > extents[1] ? extents[0] : startingFrame;

            var msToAdd = (this.speedMultiplier * (elapsed - last));
            var d = moment(lastTime).add(msToAdd, 'ms').toDate();

            if (d >= maxExtent) {
                this.playing = false;
                updatePlayState();
            }
            var func = null;
            if (msToAdd < 60 * 1000) func = time.timeSecond.round;
            else if (msToAdd > 60 * 1000 && msToAdd < 60 * 60 * 1000) func = time.timeMinute.round;
            else if (msToAdd > 60 * 60 * 1000 && msToAdd < 24 * 60 * 60 * 1000) func = time.timeHour.round;
            else if (msToAdd > 24 * 60 * 60 * 1000 && msToAdd < 7 * 24 * 60 * 60 * 1000) func = time.timeDay.round;
            else func = time.timeWeek.round;
            updatePlayer(func(d));
            lastTime = d;
            last = elapsed;
            console.log(this.playing);
            if(!this.playing) t.stop();
        });
    };
    var updatePlayer = (input) => {
        /**
         * updates the state of the player.
         * changes frame to desired and snaps the frame to the correct time resolution, to avoid loading too may images.
         * @param {number|Date} input - either an numeric index or a Date object (or a moment)
         */
        var index, time;
        var dom = this.scaleToPreload.domain(),
            domt = [this.timeToIndex(dom[0]), this.timeToIndex(dom[1])],
            originalinput = input;

        if (!isNumeric(input)) input = this.timeToIndex(input);

        if (input > domt[0] && input < domt[1])
            time = this.scaleToPreloadTicks[Math.round(input.map(domt[0], domt[1], 0, this.scaleToPreloadTicks.length - 1))];
        else
            time = originalinput;

        index = this.timeToIndex(time);
        if (index != this.currentFrameIndex) {
            select("#timeplayer-datetime-info").text(moment(time).format(this.humanFormat));
            frameChange(index);
            this.currentFrameIndex = index;
        }
        // snappy slider.
        // updateSliderX(this.topXscale(time), index);
        // smooth slider
        updateSliderX(this.topXscale(this.timeToIndex.invert(input)), index);
        // q.defer(updateSliderX, this.topXscale(time));
    };
    var updatePlayState = () => {
        /**
         * updates the play state
         * whenever the a play state event is triggered, this should be called to inform the player of what state
         * it is meant to be in (idle, loading, playing etc).
         */
        select("#" + playControlsButtonsData.playButton.id)
            .setIcon(this.playing);

        if (this.playing) {
            preloadForward(this.currentFrameIndex);

            var jobs = this.viewer.imageLoader.jobsInProgress;
            var t = timer(() => {
                if (this.viewer.imageLoader.jobsInProgress === 0) {
                    this.loaded = true;
                    beginPlay(this.currentFrameIndex);
                }
                if (this.loaded) t.stop();
            });
        } else {
            this.loaded = !this.loaded;
        }
    };
    this.togglePlay = () => {
        /**
         * toggles play mode, provided as an example..
         * @type {boolean}
         */
        this.playing = !this.playing;
        updatePlayState();
    };
    this.setFrameChangeFunction = (func) => {
        /**
         * Sets the frame change function for the player to use
         * if you are using a different player other than openseadragon you can provide a different function here.
         * the function must accept a integer argument of the frame in the sequence to display.
         */
        frameChange = func;
    };
    var bottomBrushed = () => {
        /**
         * function called when the bottom half of the timeline is brushed.
         */
        if (!event.sourceEvent) return; // Only transition after input.
        if (!event.selection) return; // Ignore empty selections.

        if (typeof event !== 'undefined' && event.sourceEvent !== null) {
            updateAxisScales();
        }
    };
    var bottomBrushEnded = () => {
        /**
         * function called after the bottom half of the time line has been brushed.
         * performs the snapping operations.
         */

        if (!event.sourceEvent) return; // Only transition after input.
        // if (!event.selection) return; // Ignore empty selections.
        if (typeof event !== 'undefined' && event.sourceEvent) {
            if (event.selection === null && brushSelection(this.bottomBrushGroup.node()) === null) {
                var v = this.snapping == "None" ? "Month" : this.snapping;
                snapTo(v);
            } else {
                snapTo();
            }
        }
    };
    var snapTo = (targetSnapping) => {
        /**
         * snaps to the snapping interval defined by this.snapping
         */

        var func = snapButtonData.choices.get(this.snapping);
        if (typeof targetSnapping !== 'undefined') func = snapButtonData.choices.get(targetSnapping);
        console.log("Snapping to " + String(targetSnapping || this.snapping));

        if (!isDefined(func) || func == "None") return;

        var brushArea = brushSelection(this.bottomBrushGroup.node());
        if (brushArea === null && event.sourceEvent) brushArea = [event.sourceEvent.x, event.sourceEvent.x + 1];

        var [x0, x1] = brushArea,
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert),
            [minRounded, maxRounded] = [minExtent, maxExtent].map(func.round);
        // this.bottomBrushGroup.call(this.bottomBrush.move, brushArea);

        // if empty when rounded, use floor & ceil instead
        if (minRounded >= maxRounded) {
            minRounded = func.floor(minExtent);
            maxRounded = func.ceil(maxExtent);
        }
        this.bottomBrush.move(this.bottomBrushGroup, [x0, x1]);
        this.bottomBrushGroup.transition().duration(1000)
            .call(this.bottomBrush.move, [minRounded, maxRounded].map(this.botXscale))
            .call(updateAxisScales);

    };
    var updateSliderColors = (index) => {
        /**
         * Updates the colours used in the top slider handle.
         * @param {number} index - what index the slider is at.
         */
        var dat = this.errorData[index];
        this.topAxisSliderHandle
            .transition().duration(100)
            .attr("fill", (d) => hsl(this.colorSelect(this.name)))
            .attr("fill-opacity", (d) => !isDefined(dat) ? 0.365 : (dat.error ? 0 : 0.8));
    };
    var updateSliderX = (topXvalue, index) => {
        /**
         * updates the position of the slider handle and calls the function to update the colour of the handle
         * topXvalue is the actual pixel location of the slider, while index is optional
         * @param {number} topXvalue - desired x pixel location of the center of the slider handle
         * @param {number} index - index of frame, can be provided so that the extra calculation isnt neccesary.
         */


        if (!isDefined(index)) {
            var time = this.topXscale.invert(topXvalue);
            index = this.timeToIndex(time);
        }

        updateSliderColors(index);
        this.topAxisSliderHandle.attr("cx", topXvalue);
        this.topAxisSliderTimeLine.attrs({"x1": topXvalue, "x2": topXvalue});
    };
    var updateAxisScales = () => {
        /**
         * updates the scales of both top and bottom time axes.
         * This is done so that whent the bottom time axis is brushed, the top time axis is transformed to match the
         * extents that were brushed.
         */

        var brushArea = brushSelection(this.bottomBrushGroup.node());
        if (brushArea === null) return;
        var [x0, x1] = brushArea;
        var [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);

        this.topAxisEle
            .call(this.topXscale.domain([minExtent, maxExtent]))
            .call(this.xAxisTop);
            // .selectAll(".topaxis text")
            // .attr("y", 0).attr("x", 0)
            // .attr("dy", "-1.1em")
            // .attr("transform", "rotate(45)");

        this.svg.selectAll(".topaxis text")
            .transition(2000)
            .attr("y", 0).attr("x", 5)
            .attr("dy", "-1.1em")
            .attr("transform", "rotate(45)")
            .style("text-anchor", "end");

        this.topAxisSliderHandle.attr("visibility", "visible");
        this.topAxisSliderTimeLine.attr("visibility", "visible");

        var xval = this.topXscale(this.timeToIndex.invert(this.currentFrameIndex.clamp(
            this.timeToIndex(minExtent), this.timeToIndex(maxExtent))));

        this.topAxisSliderTimeLine.transition().attr("x1", xval).attr("x2", xval);
        this.topAxisSliderHandle.transition().attr("cx", xval);
        reloadTimeresTicks();
        // modify the this.gradientData to be indicative of the timescale, give "datapoint" as reference tick.
        var ticks = scaleTime()
            .domain(this.botXscale.domain())
            .rangeRound([0, this.gradientData.length]).ticks(this.gradientData.length);

        this.gradientData.forEach((d, i) => {
            d.datapoint = this.timeToIndex(this.scaleToPreloadTicks[Math.floor((this.scaleToPreloadTicks.length) * i / this.gradientData.length)]);
            d.loresd = this.timeToIndex(ticks[Math.floor((ticks.length) * i / this.gradientData.length)]);
        });
        updateGradients();
    };
    var reloadTimeresTicks = () => {
        /**
         * To avoid loading too much data at once, the timeline must be resampled along time and bucketed reasonably.
         * this function ensures that there is a rounding time scale that performs this function.
         * The rounding scale (scaleToPreload/scaleToPreloadTicks) is also used by the top gradient (line), to determine
         * whether a stop is opaque or transparent.
         */

        var [x0, x1] = brushSelection(this.bottomBrushGroup.node());
        var [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);

        this.scaleToPreload.domain(this.topXscale.domain());
        if (minExtent.getTime() == maxExtent.getTime()) this.scaleToPreload.domain(this.botXscale.domain());

        this.scaleToPreloadTicks = this.scaleToPreload.ticks(this.preloadAmount);
        var zero = this.scaleToPreloadTicks[0],
            one = this.scaleToPreloadTicks[1];
        if (typeof zero == "number") return;
        if (zero.getHours() + zero.getMinutes() + zero.getSeconds() == 0 && one.getHours() + one.getMinutes() + one.getSeconds() == 0) {
            this.scaleToPreloadTicks = this.scaleToPreloadTicks.map(function (d) {
                return new Date(d.getTime() + 1000 * 60 * 60 * 12);
            });
        }
    };
    var updateGradients = () => {
        /**
         * updates the gradients (lines) on the timeline to represent the current load state of images.
         */
        this.topLineGradientStops.data(this.gradientData, (d) => d.index)
            .attr("offset", (d) =>this.offsetScale(d.index))
            .transition()
            .attr("stop-opacity", (d) => {
                if (!isDefined(this.errorData[d.datapoint])) return 0.3;
                return this.errorData[d.datapoint].error ? 0.0 : 1.0;
            });

        // rather than break the path, make the gradient stop opacity 0.
        this.botLineGradientStops.data(this.gradientData, (d) => d.index)
            .attr("offset", (d) => this.offsetScale(d.index))
            .attr("stop-opacity", (d) => {
                // var idx = this.timeToIndex(this.botXscale.invert(d.loresd));
                if (!isDefined(this.errorData[d.loresd])) return 0.3;
                return this.errorData[d.loresd].error ? 0.0 : 1.0;
            });

    };
    var rescaleTimeline = () => {
        select("#openseadragon-this.viewer").transition().style("height", String(osdHeight()) + "px");

        // dimensions.timelineWidth = jQuery("#timeplayer-timeline").width() || jQuery(window).width();

        // if (this.viewer.isFullPage()) {
        //     dimensions.timelineWidth = jQuery(window).width() - 100;
        // }
        dimensions.timelineWidth = this.timeplayerTimelineEle.node().getBoundingClientRect().width;
        this.botXscale
            .rangeRound([0, dimensions.timelineWidth]);
        this.topXscale
            .rangeRound([0, dimensions.timelineWidth]);

        this.xAxis.scale(this.botXscale);
        this.xAxisTop.scale(this.topXscale);

        this.offsetScale = scaleLinear()
            .domain([0, dimensions.timelineWidth])
            .range([0, 1]);

        this.botAxisEle.transition()
            .call(this.xAxis)
            .selectAll(".botaxis text")
            .attr("dy", "1em").attr("transform", "rotate(45)")
            .style("text-anchor", "start");


        this.svg.transition()
            .attr("width", dimensions.timelineWidth)
            .attr("width", dimensions.timelineWidth);

        this.clipPath.transition()
            .attr("width", dimensions.timelineWidth)
            .attr("height", dimensions.timelineHeight);

        this.topGroup.transition()
            .attr("width", dimensions.timelineWidth)
            .attr("height", dimensions.topHeight);

        this.botGroup.transition()
            .attr("width", dimensions.timelineWidth)
            .attr("height", dimensions.bottomHeight);

        selectAll(".background")
            .attr("width", dimensions.timelineWidth);


        this.bottomBrush.extent([[0, 0], [dimensions.timelineWidth, dimensions.bottomHeight + dimensions.axisHeight]]);
        this.bottomBrushGroup.call(this.bottomBrush);

        // recalculate
        this.gradientData = range(0, dimensions.timelineWidth).map((i)=>({index: i}));
        this.gradientData_swap = range(0, dimensions.timelineWidth).map((i)=>({index: i}));


        var s1 = this.botLineGradientStops.data(this.gradientData, (d) => d.index);
            s1.enter()
            .append("stop")
            .attrs({
                "d": (d)=>d.index,
                "offset": (d) => this.offsetScale(d.index),
                "stop-color": (d) => this.colorSelect(this.name),
                "stop-opacity": 0.3
            });
            s1.exit().remove();
        var s2 = this.topLineGradientStops.data(this.gradientData, (d) => d.index);
            s2.enter()
            .append("stop")
            .attrs({
                "d": (d)=>d.index,
                "offset": (d) => this.offsetScale(d.index),
                "stop-color": (d) => this.colorSelect(this.name),
                "stop-opacity": 0.3
            })
            s2.exit().remove();

        this.botLineGradientStops = this.botLineGradient.selectAll("stop");
        this.topLineGradientStops = this.topLineGradient.selectAll("stop");
        this.topLineGradientStops.sort((a, b) => ascending(a.index, b.index));
        this.botLineGradientStops.sort((a, b) => ascending(a.index, b.index));
        redrawPaths();
        updateAxisScales();
        updateGradients();
    };

    var redrawPaths = () => {
        this.topLineGradient
            .attrs({"x2": dimensions.timelineWidth, "y2": 0});
        this.botLineGradient
            .attrs({"x2": dimensions.timelineWidth, "y2": 0});

        this.topLineEle.data(this.lines_mapped).attr("d", (d) => topLine(d.values));
        this.botLineEle.data(this.lines_mapped).attr("d", (d) => botLine(d.values));
    };

    // line generators (NOW WITH 100% more ES6!!)
    var topLine = line()
        .x((d) => this.topXscale(d.datetime))
        .y((d) => dimensions.topHeight / 2);

    var botLine = line()
        .x((d) => this.botXscale(d.datetime))
        .y((d) => dimensions.bottomHeight / 2);


    var loadDefaultImage = () => {
        var idx = Math.floor(this.timeToIndex(this.end) / 2);
        updatePlayer(idx);
        if (this.default_image) {
            console.log("loading default image ", this.default_image);
            this.viewer.open({
                type: 'image',
                url: this.default_image
            });
        }
        else {
            console.warn("default_image requested and not included in this object.");
        }
    };
    var getURLParams = () => {
        var pos = location.href.indexOf("?");
        if (pos == -1) return [];
        var query = location.href.substr(pos + 1);
        var result = {};
        query.split("&").forEach(function (part) {
            if (!part) return;
            part = part.split("+").join(" "); // replace every + with space, regexp-free version
            var eq = part.indexOf("=");
            var key = eq > -1 ? part.substr(0, eq) : part;
            var val = eq > -1 ? decodeURIComponent(part.substr(eq + 1)) : "";
            var from = key.indexOf("[");
            if (from == -1) result[decodeURIComponent(key)] = val;
            else {
                var to = key.indexOf("]");
                var index = decodeURIComponent(key.substring(from + 1, to));
                key = decodeURIComponent(key.substring(0, from));
                if (!result[key]) result[key] = [];
                if (!index) result[key].push(val);
                else result[key][index] = val;
            }
        });
        return result;
    };
    var loadParamsFromObject = (params) => {
        var transitionSettings = (transition) => transition.duration(1000).ease("elastic");

        if (isDefined(params.x) &&
            isDefined(params.y) &&
            isDefined(params.z)) {
            this.viewer.addOnceHandler("open", function () {
                var p = new OpenSeadragon.Point(+params.x, +params.y);
                // this.viewer.viewport.panTo(p, false);
                // this.viewer.viewport.zoomTo(+params.z, false);
                // alternative that doesnt seem to work when image isnt open.
                this.viewer.viewport.panTo(this.viewer.viewport.imageToViewportCoordinates(p), false);
                this.viewer.viewport.zoomTo(this.viewer.viewport.imageToViewportZoom(+params.z), false);
                // this.viewer.viewport.update();
            });
        }

        if (isDefined(params.s)) {
            this.speedMultiplier = parseFloat(params.s);
            updateSpeedSliderTooltips();
            select("#" + speedSliderData.id).attr("value", this.speedMultiplier);
        }
        var snapToExtent = [];
        if (isDefined(params.e0) && isDefined(params.e1)) {
            snapToExtent = [this.timeToIndex.invert(+params.e0), this.timeToIndex.invert(+params.e1)];
        } else {
            snapToExtent = [this.start.toDate(), this.end.toDate()];
        }

        this.bottomBrushGroup.transition().call(this.bottomBrush.move, snapToExtent.map(this.botXscale));

        if (isDefined(params.i)) {
            // add open handler.
            this.viewer.addHandler('open', (event) => addSuccessForUrl(event.source.url));
            var m = moment(params.i, this.timestreamParse);
            var index = this.timeToIndex(m.toDate());
            this.currentFrameIndex = index;

            select("#timeplayer-datetime-info").text(moment(this.timeToIndex.invert(index)).format(this.humanFormat));

            frameChange(this.currentFrameIndex);
            updateSliderX(this.topXscale(index), index);
            // q.defer(updateSliderX, this.topXscale(time));
            // updatePlayer();
        } else {
            this.viewer.addOnceHandler('open', () => {
                // this just ignores the first event and binds to any consecutive events.
                this.viewer.addHandler('open', (event) => addSuccessForUrl(event.source.url));
            });
            loadDefaultImage();
        }
    };

    var loadURLParams = () => {
        loadParamsFromObject(getURLParams());
    };

    var getNewParams = () => {
        var point = this.viewer.viewport.viewportToImageCoordinates(this.viewer.viewport.getBounds().getCenter());
        // var point = this.viewer.viewport.getBounds().getCenter();
        var [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);

        var params = {
            "i": moment(this.timeToIndex.invert(this.viewer.currentPage())).format(this.timestreamParse),
            "e0": this.timeToIndex(minExtent),
            "e1": this.timeToIndex(maxExtent),
            "x": parseInt(point.x),
            "y": parseInt(point.y),
            "z": this.viewer.viewport.viewportToImageZoom(this.viewer.viewport.getZoom(false)),
            "s": this.speedMultiplier
            // "z": this.viewer.viewport.getZoom(false)
        };
        var s = "?" + Object.keys(params).map(function (prop) {
                return [prop, params[prop]].map(encodeURIComponent).join("=");
            }).join("&");
        return s;
    };

    var copyToClipboard = (text, elementid) => {
        var textArea = document.createElement("textarea");
        textArea.style.position = 'fixed';
        textArea.style.top = 0;
        textArea.style.left = 0;
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = 0;
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Copying text command was ' + msg);
            select("#" + elementid)
                .classes({
                    "btn-danger": !successful,
                    "btn-primary": false,
                    "btn-success": successful
                });
        } catch (err) {
            console.log(err);
            select("#" + elementid).classed("btn-danger", true);
        }
        document.body.removeChild(textArea);
        timeout(()=> {
            select("#" + elementid)
                .classes({
                    "btn-danger": false,
                    "btn-primary": false,
                    "btn-success": true
                });
        }, 2000);
    };
    var getURLParamsForCopy = () => {
        window.location = window.location.pathname + getNewParams();
        // window.history.replaceState(window.history.state, "TraitCapture", window.location.pathname + "#experimental-player-tab" + getNewParams());
        return window.location;
    };
    var getEmbedTag = () => {
        return '<embed width="' + Math.floor(dimensions.timelineWidth) + '" height="' + Math.floor(getRemainingHeight()) + '" src="https://traitcapture.org' + window.location.pathname.replace("timestreams", "timestreams-embed") + getNewParams() + '">';
    };
    var getDownloadJson = () => {
        var filename = this.name + ".json";

        var thumbnail = this.default_image.startsWith("/") ? window.location.protocol + "//" + window.location.host + this.default_image : this.default_image;
        var jsonObject = {
            "name": this.name,
            "ts_start": this.start.format(this.timestreamParse),
            "ts_end": this.end.format(this.timestreamParse),
            "width_hires": this.width_hires,
            "height_hires": this.height_hires,
            "image_type": this.image_type,
            "timestreamFormat": this.timestreamFormat,
            "timestreamParse": this.timestreamParse,
            "ts_version": "2.0"
        };
        console.log("exporting: ", jsonObject);
        var blob = new Blob([JSON.stringify(jsonObject, null, 4)], {type: 'application/json'});
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, filename);
        }
        else {
            var elem = window.document.createElement('a');
            elem.href = window.URL.createObjectURL(blob);
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
    };
    var getDownloadImg = () => {
        var url = this.viewer.world.getItemAt(this.viewer.world.getItemCount() - 1).source.url;
        var filename = url.split("/");
        filename = filename[filename.length];
        var elem = window.document.createElement('a');
        elem.href = url;
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);

    };

    var xmlToJson = (xml) => {
        // Changes XML to JSON
        // https://davidwalsh.name/convert-xml-json
        // modified by Gareth Dunstone

        // Create the return object
        var obj = {};

        if (xml.nodeType == 1) { // element
            // do attributes
            if (xml.attributes.length > 0) {
                obj = {};
                for (var j = 0; j < xml.attributes.length; j++) {
                    var attribute = xml.attributes.item(j);
                    obj[attribute.nodeName] = attribute.nodeValue;
                }
            }
        } else if (xml.nodeType == 3) { // text
            obj = xml.nodeValue;
        }

        // do children
        if (xml.hasChildNodes()) {
            for (var i = 0; i < xml.childNodes.length; i++) {
                var item = xml.childNodes.item(i);
                var nodeName = item.nodeName;
                if (typeof(obj[nodeName]) == "undefined") {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (typeof(obj[nodeName].push) == "undefined") {
                        var old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
        }
        return obj;
    };

    var timecamFormatToTimestreamFormat = (configXmlObject) => {
        var shittyDateParse = (ds) => {
            try {
                var shittyFormat = "M/D/YYYY h:m:s A";
                return moment(ds, shittyFormat);
            } catch (e) {
                console.log("Couldn't parse your badly formatted datetime. Sucks to be you.", e);
                return moment();
            }
        };

        var timestreamDataObject = {};
        // var a = {
        //     "datapresenter" :{
        //         "globals" : {
        //             "dynamic_config":"true",
        //             "panel_padding":"3px",
        //             "panel_border":"1px",
        //             "timespan_days_init":"0.5",
        //             "date_active_ratio_init":"1.0",
        //             "date_start":"9/12/2008 7:23:33 AM",
        //             "date_end":"9/30/2016 12:18:00 AM",
        //             "date_end_old":"now",
        //             "period":"1 minute",
        //             "observe_daylight_savings_time":"True",
        //             "daylight_savings_time_locale":"us",
        //             "test":"1"
        //         },
        //         "components": {
        //             "timecam":
        //             {
        //                 "id":"o_timecam",
        //                 "image_access_mode":"TIMESTREAM",
        //                 "image_type":"JPG",
        //                 "show_zoom":"false",
        //                 "no_header":"false",
        //                 "show_datestamp":"true",
        //                 "width":"640",
        //                 "height":"480",
        //                 "play_num_images":"60",
        //                 "play_num_images_hires":"30",
        //                 "enable_noon_lock":"True",
        //                 "default_speed":"0.60",
        //                 "title":"Salt Lake City Weather Camera",
        //                 "url_image_list":"http://timecam.tv.s3.amazonaws.com/mediablock/timestreams/TimeScience/metcam~640/full",
        //                 "stream_name":"metcam~640",
        //                 "period":"1 minute",
        //                 "utc":"true",
        //                 "timezone":"-7",
        //                 "show_imageset_load_progress":"true",
        //                 "show_image_load_status":"true"
        //             }
        //     }
        // }
        // a  = {default_image:"/api/default_image/by-id/56922cf6d131441c9a2681f5",
        //     delay:200,
        //     end_datetime:"2016-01-10T21:05:42.365000",
        //     filename:"BVZ0049-GC05L-C01~1920-orig",
        //     filename_hires:"BVZ0049-GC05L-C01~fullres-orig",
        //     height:1280,
        //     height_hires:"1280",
        //     image_type:"JPG",
        //     imagelist:false,
        //     name:"BVZ0049-GC05L-C01",
        //     ongoing:true,
        //     period:900,
        //     start_datetime:"2015-11-08T15:45:00",
        //     webroot:"http://phenocam.anu.edu.au/cloud/a_data/TimeStreams/Borevitz/BVZ0049/outputs/BVZ0049-GC05L-C01~1920-orig",
        //     webroot_hires:"http://phenocam.anu.edu.au/cloud/a_data/TimeStreams/Borevitz/BVZ0049/originals/BVZ0049-GC05L-C01~fullres-orig",
        //     width:1920,
        //     width_hires:"1920"}
        //
        // "http://timecam.tv.s3.amazonaws.com/mediablock/timestreams/TimeScience/metcam~640/full/2016/2016_09/2016_09_30/2016_09_30_03/metcam~640_2016_09_30_03_05_00_00.jpg"
        // "http://timecam.tv.s3.amazonaws.com/mediablock/timestreams/TimeScience/metcam~640/full/2012/2012_09/2012_09_01/2012_09_01_11/metcam~640_2012_09_01_11_59_46_00.jpg
        timestreamDataObject.ongoing = configXmlObject.datapresenter.globals.date_end == 'now';
        timestreamDataObject.start_datetime = shittyDateParse(configXmlObject.datapresenter.globals.date_start);
        if (!timestreamDataObject.ongoing) timestreamDataObject.end_datetime = shittyDateParse(configXmlObject.datapresenter.globals.date_end);
        var period_str = configXmlObject.datapresenter.globals.period;
        // match first of these options
        var periodmatch = /(second|minute|hour|day)/;
        // match first digit value of any length
        // get the period interval type or second
        var ptype = (periodmatch.exec(period_str) || ["second"])[0];
        //get the period type
        var period_mult = {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400
        }[ptype];
        var numbermatch = /\d+/;
        // get the actual number involved.
        var periodnum = parseFloat((numbermatch.exec(period_str) || ["300"])[0]);
        timestreamDataObject.period = periodnum * period_mult;
        timestreamDataObject.name = configXmlObject.datapresenter.components.timecam.title;
        timestreamDataObject.delay = 200;
        timestreamDataObject.width = configXmlObject.datapresenter.components.timecam.width;
        timestreamDataObject.height = configXmlObject.datapresenter.components.timecam.height;
        timestreamDataObject.webroot = configXmlObject.datapresenter.components.timecam.url_image_list;
        timestreamDataObject.filename = configXmlObject.datapresenter.components.timecam.stream_name;
        timestreamDataObject.image_type = configXmlObject.datapresenter.components.timecam.image_type.toLowerCase();
        return timestreamDataObject;
    };

    var loadImageFiles = (files) => {
        console.log("number of files: ", files.length);
        this.viewer.sequenceMode = true;
        this.viewer.tileSources = [];
        var nfiles = 0;

        function checkCompletion() {
            if (nfiles == files.length) {
                this.viewer.tileSources.sort((a, b) => a.idx > b.idx);
                switchToIndexTimeline(nfiles);
            }
        }

        for (var i = 0; i < files.length; i++) {
            ((e) => {
                var reader = new FileReader();
                reader.onload = (a) => {
                    this.viewer.tileSources.push({idx: e, url: a.target.result, type: 'image'});
                    nfiles++;
                    checkCompletion();
                };

                var blob = files[e];
                reader.readAsDataURL(blob);
            })(i)
        }
    };

    var switchToIndexTimeline = (length) => {
        this.numTimePoints = length - 1;
        select("#timeplayer-timeline").selectAll("*").remove();
        this.gradientData = range(0, dimensions.timelineWidth).map((i)=>({index: i}));
        this.gradientData_swap = range(0, dimensions.timelineWidth).map((i)=>({index: i}));

        var dataExtent = extent([0, length - 1]);

        this.scaleToPreload = scaleTime()
            .domain(dataExtent)
            .rangeRound([0, this.preloadAmount]);

        this.scaleToPreloadTicks = this.scaleToPreload.ticks(this.preloadAmount);

        this.lines_mapped = [
            {
                values: [{datetime: 0}, {datetime: length}]
            }
        ];

        //nullify these.
        preloadOmni = function () {
        };
        preloadOne = function () {
        };
        preloadForward = function () {
        };
        snapTo = function () {
        };
        reloadTimeresTicks = function () {
        };

        this.viewer.goToPage = function (page) {
            this._sequenceIndex = page + 1;
            this.open(this.tileSources[page + 1]);
            return this;
        };

        updatePlayer = (index) => {
            index = this.timeToIndex(index);
            if (index != this.currentFrameIndex) {
                this.currentFrameIndex = index;
                select("#timeplayer-datetime-info").text(index);
                frameChange(index);
            }
            // snappy slider.
            // updateSliderX(this.topXscale(time), index);
            // smooth slider
            updateSliderX(this.topXscale(index), index);
            // q.defer(updateSliderX, this.topXscale(time));
        };

        beginPlay = (index) => {
            var last = 0;
            updatePlayer(index);

            var t = timer((elapsed) => {

                var [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
                    [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);
                if (x0 == x1) [minExtent, maxExtent] = [0, this.timeToIndex(this.end)];

                // var startAdd = startingFrame < extents[0] || startingFrame > extents[1] ? extents[0] : startingFrame;

                if (this.currentFrameIndex >= maxExtent) {
                    this.playing = false;
                    updatePlayState();
                }

                if (last + (5000000 / this.speedMultiplier) < elapsed) {
                    last = elapsed;
                    updatePlayer(this.currentFrameIndex + 1);
                }

                if (!this.playing) t.stop();
            });
        };


        select("#" + playControlsButtonsData.omniPreloadButton.id).remove();
        select("#" + snapButtonData.id).remove();
        select("#" + shareDropdownData.id).remove();

        this.colorSelect = scaleOrdinal(schemeCategory10)
            .domain([this.name]);

        this.timeToIndex = scaleLinear()
            .domain(dataExtent)
            .rangeRound([0, this.numTimePoints])
            .clamp(true);

        this.botXscale = scaleLinear()
            .domain(dataExtent)
            .rangeRound([0, dimensions.timelineWidth])
            .clamp(true);

        this.topXscale = scaleLinear()
            .domain(dataExtent)
            .rangeRound([0, dimensions.timelineWidth]);

        this.topYscale = scaleBand()
            .domain([this.name])
            .rangeRound([dimensions.axisHeight / 2, dimensions.topHeight]);

        this.botYscale = scaleBand()
            .domain([this.name])
            .rangeRound([dimensions.axisHeight / 2, dimensions.bottomHeight]);

        this.offsetScale = scaleLinear()
            .domain([0, dimensions.timelineWidth])
            .range([0, 1]);

        this.xAxis = axisTop()
            .scale(this.botXscale)
            .tickPadding(10);
        // .tickSubdivide(true)

        this.xAxisTop = axisBottom()
            .scale(this.topXscale)
            .tickPadding(10);
        // .tickSubdivide(true)

        createElements(dataExtent);
    };

    var constructTimeline = () => {

        initUI(this.selector);
        dimensions.timelineWidth = this.timeplayerTimelineEle.node().getBoundingClientRect().width;

        select("#timeplayer-timeline").selectAll("*").remove();
        this.gradientData = range(0, dimensions.timelineWidth).map((i)=>({index: i}));
        this.gradientData_swap = range(0, dimensions.timelineWidth).map((i)=>({index: i}));

        var s = this.start.clone(),
            e = this.end.clone().subtract(this.period, "seconds");
        var dataExtent = extent([s, e]);

        this.scaleToPreload = scaleTime()
            .domain(dataExtent)
            .rangeRound([0, this.preloadAmount + 1])
            .nice(time.timeDay);

        this.scaleToPreloadTicks = this.scaleToPreload.ticks(this.preloadAmount);
        this.lines_mapped = [
            {
                values: [
                    {
                        datetime: this.start.clone().toDate(),
                    },
                    {
                        datetime: this.end.clone().toDate(),
                    }
                ]
            }
        ];

        this.colorSelect = scaleOrdinal(schemeCategory10)
            .domain([this.name]);

        this.timeToIndex = scaleTime()
            .domain(dataExtent)
            .rangeRound([0, this.numTimePoints - 1])
            .clamp(true);

        this.botXscale = scaleTime()
            .domain(dataExtent)
            .rangeRound([0, dimensions.timelineWidth])
            .clamp(true);

        this.topXscale = scaleTime()
            .domain(dataExtent)
            .rangeRound([0, dimensions.timelineWidth]);

        this.topYscale = scaleBand()
            .domain([this.name])
            .rangeRound([dimensions.axisHeight / 2, dimensions.topHeight]);

        this.botYscale = scaleBand()
            .domain([this.name])
            .rangeRound([dimensions.axisHeight / 2, dimensions.bottomHeight]);

        this.offsetScale = scaleLinear()
            .domain([0, dimensions.timelineWidth])
            .range([0, 1]);

        var formatMillisecond = timeFormat(".%L"),
            formatSecond = timeFormat(":%S"),
            formatMinute = timeFormat("%I:%M"),
            formatHour = timeFormat("%I %p"),
            formatDay = timeFormat("%a %d"),
            formatWeek = timeFormat("%b %d"),
            formatMonth = timeFormat("%B"),
            formatYear = timeFormat("%Y");

        var customTimeFormat = (date) => {
            return (   time.timeSecond(date) < date ? formatMillisecond
                : time.timeMinute(date) < date ? formatSecond
                : time.timeHour(date) < date ? formatMinute
                : time.timeDay(date) < date ? formatHour
                : time.timeMonth(date) < date ? (time.timeWeek(date) < date ? formatDay : formatWeek)
                : time.timeYear(date) < date ? formatMonth
                : formatYear)
            (date);
        };

        this.xAxis = axisTop()
            .scale(this.botXscale)
            .tickPadding(10)
            // .tickSubdivide(true)
            .tickFormat(customTimeFormat);

        this.xAxisTop = axisBottom()
            .scale(this.topXscale)
            .tickPadding(10)
            // .tickSubdivide(true)
            .tickFormat(customTimeFormat);
        createElements(dataExtent);
    };


    var createElements = (dataExtent) => {
        this.svg = select("#timeplayer-timeline")
            .append("svg")
            .attrs({
                "width": dimensions.timelineWidth,
                "height": dimensions.timelineHeight
            });

        this.botAxisEle = this.svg.append("g")
            .classes({
                "x": true,
                "axis": true,
                "botaxis": true
            })
            .attrs({
                "transform": "translate(0," + dimensions.botAxisY + ")",
                "height": dimensions.axisHeight
            })
            .style("user-select", "none")
            .call(this.xAxis);

        this.botAxisText = this.svg.selectAll(".botaxis text")
            .attrs({
                "y": 0, "x": 0,
                'dy': "1em",
                "transform": "rotate(45)"
            })
            .style("text-anchor", "start");

        this.topAxisEle = this.svg.append("g")
            .classes({
                "x": true,
                "axis": true,
                "topaxis": true
            })
            .attrs({
                "height": 0,
                "transform": "translate(0," + (dimensions.topY) + ")"
            })
            .style("user-select", "none")
            .call(this.xAxisTop);

        this.svg.selectAll(".topaxis text")
            .attrs({
                "y": 0, "x": 0,
                'dy': "-1.2em",
                "transform": "rotate(45)"
            });

        var sliderTween = () => {
            var sliderError = this.sliderTarget - this.sliderActual;
            if (Math.abs(sliderError) < 1e-3) this.sliderActual = this.sliderTarget, this.sliderTimer.stop();
            else this.sliderActual += sliderError * 0.3;
            this.topAxisSliderHandle.attr("cx", this.sliderActual);
            this.topAxisSliderTimeLine.attrs({
                "x1": this.sliderActual,
                "x2": this.sliderActual
            });
            var t = this.topXscale.invert(this.sliderActual);
            updatePlayer(t);
        };
        this.sliderActual = 0;
        this.sliderTarget = 0;
        this.sliderTimer = timer(sliderTween);
        var sliderDragged = (x) => {
            this.sliderTarget = x;
            this.sliderTimer.restart(sliderTween);
        };

        this.clipPath = this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attrs({
                "width": dimensions.timelineWidth,
                "height": dimensions.timelineHeight
            });

        this.topGroup = this.svg.append("g")
            .attrs({
                "width": dimensions.timelineWidth,
                "height": dimensions.topHeight,
                "transform": "translate(0," + dimensions.topY + ")"
            })
            .classed("top", true);

        this.botGroup = this.svg.append("g")
            .attrs({
                "width": dimensions.timelineWidth,
                "height": dimensions.bottomHeight,
                "transform": "translate(0," + dimensions.botY + ")"
            })
            .classed("bot", true);

        this.topLineEle = this.topGroup.append("g").selectAll(".topLineItems")
            .data(this.lines_mapped).enter().append("path")
            .classed("topLines", true)
            .attrs({
                "d": (d) => topLine(d.values),
                "stroke": "url(#topLineGradient)"
            })
            .style("stroke-width", dimensions.topHeight * 0.75);

        this.botLineEle = this.botGroup.append("g").selectAll(".bottomLineItems")
            .data(this.lines_mapped).enter().append("path")
            .classed("bottomLines", true)
            .attrs({
                "d": (d) => botLine(d.values),
                "stroke": "url(#botLineGradient)"
            })
            .style("stroke-width", dimensions.bottomHeight * 0.5);

        this.botLineGradient = this.svg.append("linearGradient")
            .attrs({
                "id": "botLineGradient",
                "gradientUnits": "userSpaceOnUse",
                "x1": 0,
                "y1": 0,
                "x2": dimensions.timelineWidth,
                "y2": 0
            });

        this.botLineGradientStopsData = this.botLineGradient.selectAll("stop")
            .data(this.gradientData, (d) => d.index);

        this.botLineGradientStops = this.botLineGradientStopsData.enter()
            .append("stop")
            .attrs({
                'd': (d)=>d.index,
                "offset": (d) => this.offsetScale(d.index),
                "stop-color": (d) => this.colorSelect(this.name),
                "stop-opacity": 0.3
            });

        this.topLineGradient = this.svg.append("linearGradient")
            .attrs({
                "id": "topLineGradient",
                "gradientUnits": "userSpaceOnUse",
                "x1": 0,
                "y1": 0,
                "x2": dimensions.timelineWidth,
                "y2": 0
            });

        this.topLineGradientStopsData = this.topLineGradient.selectAll("stop")
            .data(this.gradientData, (d) => d.index);

        this.topLineGradientStops = this.topLineGradientStopsData.enter()
            .append("stop")
            .attrs({
                'd': (d)=>d.index,
                "offset": (d) => this.offsetScale(d.index),
                "stop-color": (d) => this.colorSelect(this.name),
                "stop-opacity": 0.3
            });

        this.loadingGradient = this.svg.append("radialGradient")
            .attrs({
                "id": "loadingGradient",
                "x1": "0%",
                "y1": "0%",
                "x2": "100%",
                "y2": "100%",
                "spreadMethod": "pad"
            });

        this.loadingGradientRect = this.svg.append("rect")
            .attrs({
                "id": "loadingGradientRect",
                "width": dimensions.timelineWidth,
                "height": dimensions.bottomHeight + dimensions.topHeight,
                "transform": "translate(0," + dimensions.topY + ")"
            })
            .styles({
                "pointer-events": "none",
                "fill": "url(#loadingGradient)"
            });

        // are these really needed?
        this.loadingGradient.append("stop")
            .attrs({
                "offset": "0%",
                "stop-color": rgb("blueviolet"),
                "stop-opacity": 0.6
            });

        this.loadingGradient.append("stop")
            .attrs({
                "offset": "0%",
                "id": "loadingStop",
                "stop-color": rgb("white"),
                "stop-opacity": 0.0
            });

        this.topLineGradientStops = this.topLineGradientStops.sort((a, b) => ascending(a.index, b.index));
        this.botLineGradientStops = this.botLineGradientStops.sort((a, b) => ascending(a.index, b.index));

        var sliderDrag = drag()
            .on("start.interrupt", () => this.topAxisSlider.interrupt())
            .on("start drag", () => {
                sliderDragged(event.x);
                if (this.playing == true) {
                    this.playing = false;
                    updatePlayState();
                }
            });

        this.topAxisDragger = this.svg.append("rect")
            .classed("topaxisbg", true)
            .style("fill", "transparent")
            .attrs({
                "height": ()=>dimensions.axisHeight + dimensions.topHeight,
                "width": ()=>dimensions.timelineWidth,
                "z-index": "-99999"
            })
            .style("user-select", "none")
            .call(sliderDrag);

        this.topAxisSlider = this.svg.append("g")
            .classed("slider", true)
            .styles({
                "stroke-width": "2px",
                "stroke": "black",
                "stroke-opacity": .6
            })
            .call(sliderDrag);

        this.topAxisSliderTimeLine = this.topAxisSlider.append("line")
            .style("stroke-width", "3px")
            .attrs({
                "y1": dimensions.topAxisY + dimensions.axisHeight,
                "y2": dimensions.botY
            });

        var topAxisSliderHandleRadius = () => -3 + dimensions.axisHeight / 2;
        this.topAxisSliderHandle = this.topAxisSlider.append("circle")
            .attrs({
                "r": topAxisSliderHandleRadius,
                "cy": (d) => parseFloat(this.topAxisSliderTimeLine.attr("y1")) - parseFloat(topAxisSliderHandleRadius())
            });

        this.bottomBrush = brushX()
            .extent([[0, 0], [dimensions.timelineWidth, dimensions.bottomHeight + dimensions.axisHeight]])
            .on("start", () => {
                // apparently not having this breaks everything.
                if (event && event.sourceEvent != null) {
                    if (event.sourceEvent.sourceEvent != null) {
                        try {
                            event.sourceEvent.sourceEvent.stopPropagation();
                        } catch (e) {
                        }
                    }
                    else {
                        try {
                            event.sourceEvent.stopPropagation();
                        } catch (e) {
                        }
                    }
                } else {
                    try {
                        event.sourceEvent.stopPropagation();
                    } catch (e) {
                    }
                }
            })
            .handleSize(25)
            .on("brush", bottomBrushed)
            .on("end", bottomBrushEnded);

        this.bottomBrushGroup = this.svg.append("g")
            .attrs({
                "height": dimensions.bottomHeight,
                "width": dimensions.timelineWidth,
                "transform": "translate(0," + dimensions.botY + ")",
                "class": "bot-brush"
            })
            .styles({
                "stroke": "gray",
                "stroke-width": "1px",
                "fill": "dodgerblue",
                "fill-opacity": .365
            })
            .call(this.bottomBrush);

        this.bottomBrushGroup.selectAll(".resize").append("rect")
            .classed("rect-resize-handle", true)
            .styles({
                "fill": "dodgerblue",
                "fill-opacity": .4
            })
            .attrs({
                "transform": (d, i) => "translate(" + (i ? 0 : -25) + ",0)",
                "width": 25
            });

        this.bottomBrushGroup.selectAll("rect")
            .attrs({
                "y": 0,
                "height": dimensions.bottomHeight + dimensions.axisHeight
            });

        var roprect = this.topGroup.append("rect")
            .attrs({
                "pointer-events": "none",
                "width": dimensions.timelineWidth,
                "height": dimensions.topHeight
            })
            .style("fill", "none");


        this.bottomBrushGroup.call(this.bottomBrush.move, dataExtent.map(this.botXscale));
        sliderDragged(dimensions.timelineWidth / 2);
        loadURLParams();
        rescaleTimeline();
        redrawPaths();
        updateAxisScales();

    };

    select(document).on('drag dragstart dragend dragover dragenter dragleave drop', this.selector, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }).on('dragover dragenter', this.selector, function () {
        select(this).classed('bg-info', true);
    }).on('dragleave dragend drop', this.selector, function () {
        select(this).classed('bg-info', false);
    }).on('drop', this.selector, (e) => {
        var files = e.originalEvent.dataTransfer.files;
        if (e.ctrlKey) {
            loadImageFiles(files);
        } else {
            var file = files[0];

            // anon function so we only need to evaluate when its not application/json
            var fext = () => file.name.split(".")[file.name.split(".").length - 1] !== "json";
            if (file.type !== "application/json" || fext()) {
                console.log(file.name.split(".")[file.name.length - 1]);
                // bootbox.alert("You provided an invalid file.\nOnly JSON files and images are supported.");
                return;
            }

            var reader = new FileReader();
            reader.onload = (e) => {
                var output = e.target.result;
                var json = JSON.parse(output);
                // we only read the first element
                if (Array.isArray(json)) json = json[0];
                // using ES6 arrowfuncs means we can access the parent element naturally.
                this.errorData = {};
                parseOpts(json);
                var o = estimateTimelineData(json, constructTimeline);
                parseOpts(o);
            };
            reader.readAsText(files[0])
        }
    });

    select(window).on("resize", rescaleTimeline);
    this.viewer.addHandler("full-screen", () => {
        rescaleTimeline();
        var d = playControlsButtonsData.fullscreenButton;
        select("#" + d.id).selectAll("span.glyphicon")
            .attr("class", ()=> this.viewer.isFullPage() ? glyphiconWaitClass(d) : glyphiconDefaultClass(d));
    });

    return this;
};

export default TimePlayer;

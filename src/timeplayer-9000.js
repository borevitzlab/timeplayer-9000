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
import {csv, text, tsv, xml, json, request} from 'd3-request';
import {scaleLinear, scaleTime, scaleOrdinal, scaleBand, schemeCategory10} from 'd3-scale';
import {map, values, keys, entries} from 'd3-collection';
import * as easing from 'd3-ease';

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

window.time = time;
window.timeFormat = timeFormat;


// hijack selection
selection.prototype.dropdown = function () {
    new Dropdown(this.node());
    return this;
};

function attrsFunction(s, map) {
    return s.each(function () {
        let x = map.apply(this, arguments), s = select(this);
        for (let name in x) s.attr(name, x[name]);
    });
}

function attrsObject(s, map) {
    for (let name in map) s.attr(name, map[name]);
    return s;
}

function propertiesFunction(s, map) {
    return s.each(function () {
        let x = map.apply(this, arguments), s = select(this);
        for (let name in x) s.property(name, x[name]);
    });
}

function propertiesObject(s, map) {
    for (let name in map) s.property(name, map[name]);
    return s;
}

function classesFunction(s, map) {
    return s.each(function () {
        let x = map.apply(this, arguments), s = select(this);
        for (let name in x) s.classed(name, x[name]);
    });
}

function classesObject(s, map) {
    for (let name in map) s.classed(name, map[name]);
    return s;
}

function stylesFunction(s, map, priority) {
    return s.each(function () {
        let x = map.apply(this, arguments), s = select(this);
        for (let name in x) s.style(name, x[name], priority);
    });
}

function stylesObject(s, map, priority) {
    for (let name in map) s.style(name, map[name], priority);
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

const copyToClipboard = (text, elementid) => {
    let textArea = document.createElement("textarea");
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
        let successful = document.execCommand('copy');
        let msg = successful ? 'successful' : 'unsuccessful';
        this.log('Copying text command was ' + msg);
        select("#" + elementid)
            .classes({
                "btn-danger": !successful,
                "btn-primary": false,
                "btn-success": successful
            });
    } catch (err) {
        // console.error(err);
        select("#" + elementid).classed("btn-danger", true);
    }
    document.body.removeChild(textArea);
    timeout(() => {
        select("#" + elementid)
            .classes({
                "btn-danger": false,
                "btn-primary": false,
                "btn-success": true
            });
    }, 2000);
};

const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);

const NaNify = (n) => isNumeric(n) ? parseFloat(n) : NaN;

const isDefined = (v) => (typeof v !== 'undefined');

const inArray = (value, array) => array.indexOf(value) > -1;

const initLog = () => {
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

const timeInterval = (interval, amount) => {
    return (date) => {
        let subHalf = interval.offset(date, -amount / 2);
        let addHalf = interval.offset(date, amount / 2);
        return interval.range(subHalf, addHalf, amount)[0];
    }
};

const everyInterval = (interval, amount) => {
    return interval.every(amount).range;
};

const seconds = (n) => n * 1000,
    minutes = (n) => seconds(60) * n,
    hours = (n) => minutes(60) * n,
    days = (n) => hours(24) * n,
    weeks = (n) => days(7) * n,
    months = (n) => weeks(4) * n,
    years = (n) => months(12) * n,
    everySeconds = (n) => everyInterval(time.timeSecond, n),
    everyMinutes = (n) => everyInterval(time.timeMinute, n),
    everyHours = (n) => everyInterval(time.timeHour, n),
    everyDays = (n) => everyInterval(time.timeDay, n),
    everyWeeks = (n) => everyInterval(time.timeWeek, n),
    everyMonths = (n) => everyInterval(time.timeMonth, n),
    everyYears = (n) => everyInterval(time.timeYear, n);


const formatMillisecond = timeFormat(".%L"),
    formatSecond = timeFormat("%H:%M:%S"),
    formatMinute = timeFormat("%H:%M"),
    formatHour = timeFormat("%H:%M"),
    formatDay = timeFormat("%e %b"),
    formatWeek = timeFormat("%e %b"),
    formatMonth = timeFormat("%b '%y"),
    formatYear = timeFormat("%b %Y");

const customTimeFormat = (date) => {
    /**
     * custom time format function for timeplayer ticks.
     */
    return (
        time.timeSecond(date) < date ? formatMillisecond
        : time.timeMinute(date) < date ? formatSecond
        : time.timeHour(date) < date ? formatMinute
        : time.timeDay(date) < date ? formatHour
        : time.timeMonth(date) < date ? (time.timeWeek(date) < date ? formatDay : formatWeek)
        : time.timeYear(date) < date ? formatMonth
        : formatYear)
    (date);
};

// set of intervals for the timeplayer to resample to.
const intervalSetArray = [
    [(d) => true, everySeconds(1)],
    [(d) => +d > minutes(1), everyMinutes(1)],
    [(d) => +d > minutes(5), everyMinutes(5)],
    [(d) => +d > minutes(15), everyMinutes(15)],
    [(d) => +d > minutes(30), everyMinutes(30)],
    [(d) => +d > hours(1), everyHours(1)],
    [(d) => +d > hours(3), everyHours(3)],
    [(d) => +d > hours(6), everyHours(6)],
    [(d) => +d > hours(12), everyHours(12)],
    [(d) => +d > days(1), everyDays(1)],
    [(d) => +d > days(2), everyDays(2)],
    [(d) => +d > days(7), everyDays(7)],
    [(d) => +d > weeks(2), everyWeeks(2)]
];

export class ES6Player {
    constructor(options) {
        /**
         * Constructor.
         * should only ever be called once.
         */
        this.createLog();
        // our member vars
        this.gradientData = [];
        this.errorData = {};
        this.errorData_swap = {};
        this.gradientData_swap = [];

        this.default_image = null;
        this.numTimePoints = 0;
        this.compositeOperation = "source-over";
        this.selector = "#timeplayer-9000";
        this.viewerId = Math.random().toString(36).substr(2, 5);
        this.snapping = "None";
        this.playing = false;
        this.period = 300;
        this.preloadAmount = 200;
        this.currentFrameIndex = 5;
        this.height = 240;
        this.width = 640;
        this.hires = false;
        this.backgroundColor = "black";
        this.speedMultiplier = 3600;
        this.autoPlay = false;
        this.humanFormat = "YYYY-MM-DD HH:mm";
        this.timestreamParse = "YYYY_MM_DD_HH_mm_ss_00";
        this.timestreamFormat = "[webroot]/YYYY/YYYY_MM/YYYY_MM_DD/YYYY_MM_DD_HH/[filename]_YYYY_MM_DD_HH_mm_ss_00.[extension]";
        this.loaded = false;

        this.reasonableMaxNumTimePoints = 365 * 24 * Math.pow(60, 2) / 600;
        this.overlays = [];
        this.originalExtent = [];


        // dimensions object. change this if you want to change the dimensions of the timebar.
        this.dimensions = {
            timelineWidth: window.innerWidth,
            timelineHeight: 110,
            axisHeight: 34,
            iconSize: 22
        };

        this.dimensions.bottomHeight = (this.dimensions.timelineHeight / 2) - this.dimensions.axisHeight;
        this.dimensions.topHeight = this.dimensions.bottomHeight;
        this.dimensions.topAxisY = 0;
        this.dimensions.botAxisY = this.dimensions.timelineHeight - this.dimensions.axisHeight;
        this.dimensions.botY = this.dimensions.botAxisY - this.dimensions.bottomHeight;
        this.dimensions.topY = this.dimensions.botY - this.dimensions.topHeight;

        this.mapObj = {
            "webroot": null,
            "filename": null,
            "webroot_hires": null,
            "filename_hires": null,
            "extension": null
        };

        // line generators (NOW WITH 100% more ES6!!)
        this.topLine = line()
            .x((d) => this.topXscale(d.datetime))
            .y((d) => this.dimensions.topHeight / 2);

        this.botLine = line()
            .x((d) => this.botXscale(d.datetime))
            .y((d) => this.dimensions.bottomHeight / 2);

        // creates the button datas.
        this.playControlsButtonsData = {
            playButton: {
                id: "play-button",
                title: "Preload and Play",
                octicon: octicons.triangleright,
                octiconWait: octicons.watch,
                clickedCallback: (d) => {
                    this.log("Speed - ", this.speedMultiplier);
                    this.playing = !this.playing;
                    select("#" + this.playControlsButtonsData.omniPreloadButton.id).setIcon(false);
                    this.updatePlayState();
                }
            },
            omniPreloadButton: {
                id: "omnipreload-button",
                title: "Preload",
                octicon: octicons.zap,
                octiconWait: octicons.watch,
                clickedCallback: (d) => {
                    this.playing = false;
                    select("#" + this.playControlsButtonsData.playButton.id).setIcon(false);
                    this.preloadOmni();
                }
            },
            fullscreenButton: {
                id: "fullscreen-button",
                title: "Toggle Fullscreen",
                octicon: octicons.screennormal,
                octiconWait: octicons.screenfull,
                clickedCallback: () => {
                    this.viewer.setFullScreen(!this.viewer.isFullPage());
                }
            }
        };
        this.hiresButton = {
            id: "hires-button",
            title: "Toggle High Resolution",
            octicon: octicons.unfold,
            octiconWait: octicons.fold,
            clickedCallback: (d) => {
                this.hires = !this.hires;

                [this.gradientData_swap, this.gradientData, this.errorData_swap, this.errorData] = [this.gradientData, this.gradientData_swap, this.errorData, this.errorData_swap];

                let s1 = this.botLineGradientStops.data(this.gradientData, (d) => d.index);
                let s2 = this.topLineGradientStops.data(this.gradientData, (d) => d.index);

                s1.enter()
                    .append("stop")
                    .attrs({
                        "d": (d) => d.index,
                        "offset": (d) => this.offsetScale(d.index),
                        "stop-color": (d) => this.colorSelect(this.name),
                        "stop-opacity": 0.3
                    });

                s2.enter()
                    .append("stop")
                    .attrs({
                        "d": (d) => d.index,
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
                this.redrawPaths();
                this.updateAxisScales();
                this.updateGradients();

                this.updatePlayer(this.currentFrameIndex, true);
                jQuery("#" + this.hiresButton.id).attr("title", this.hires ? "High Resolution" : "Low Resolution");
            }
        };
        this.snapButtonData = {
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
            clickedCallback: (d) => {
                let idx = d.choices.keys().indexOf(this.snapping);

                let [x0, x1] = brushSelection(this.bottomBrushGroup.node());

                if (idx == 0) this.originalExtent = [x0, x1];

                let target = (idx + 1) % d.choices.size();
                if (target < 0) target += d.choices.size();
                this.snapping = d.choices.keys()[target];

                select(event.srcElement).text(this.snapping);
                event.stopPropagation();
                if (this.snapping == "None")
                    this.bottomBrushGroup.transition()
                        .call(this.bottomBrush.move, this.originalExtent);
                else
                    this.snapTo(this.snapping);
            }
        };

        this.shareDropdownData = {
            id: "share-dropdown-button",
            title: "",
            octicon: octicons.linkexternal,
            subButtons: {
                copyLink: {
                    id: "copylink-button",
                    title: "Copy bookmark link to clipboard",
                    octicon: octicons.bookmark,
                    clickedCallback: () => copyToClipboard(this.getURLParamsForCopy())
                },
                embedLink: {
                    id: "embedlink-button",
                    title: "Copy embed bookmark code to clipboard",
                    octicon: octicons.pin,
                    clickedCallback: () => copyToClipboard(this.getEmbedTag())
                },
                downloadImg: {
                    id: "downloadimg-button",
                    title: "Download the current image",
                    octicon: octicons.filemedia,
                    clickedCallback: () => this.log(this.getDownloadImg())
                },
                downloadJson: {
                    id: "downloadjson-button",
                    title: "Download a copy of this timestreams json data",
                    octicon: octicons.filecode,
                    clickedCallback: () => this.log(this.getDownloadJson())
                }
            }
        };
        this.speedSliderData = {
            id: "timeplayer-speed-slider",
            title: "Realtime speed multiplier",
            min: 300,
            max: 100000,
            value: 3600,
            changeCallback: (d) => {
                let sourceEle = event.target;
                let speed = sourceEle.value;
                this.speedMultiplier = parseFloat(speed);
                this.updateSpeedSliderTooltips();
            },
            detents: [
                3600,
                10080,
                43200
            ]
        };

        // if options isnt defined error our
        if (!isDefined(options)) {
            this.error("No options provided....");
            return;
        }
        // if no url or data source is defined error out.
        if (!isDefined(options.url) && !isDefined(options.jsonString) && !isDefined(options.data)) {
            this.error("No data source in options...");
            return;
        }

        // parse options into 'this'
        this.parseOptsIntoMe(options);
        this.createViewer();
        this.addListeners();

        if (isDefined(options.url)) {
            let callback = (err, data) => this.estimateTimelineData(data);

            if (options.url.split("?")[0].endsWith("json")){
                json(options.url, callback);
            }
            else if (options.url.includes("xml")){
                xml(options.url, (err, data) => callback(null, this.timecamFormatToTimestreamFormat(this.xmlToJson(data))));
            }
            else{
                this.error("malformed url (supporting .json and .jsonp)");
                return;
            }
        } else if (isDefined(options.jsonString)) {
            this.estimateTimelineData(JSON.parse(options.jsonString));
        }
    }


    addListeners() {
        this.log("Adding listeners...");
        // add fullscreen resize handler.
        this.viewer.addHandler("full-screen", () => this.rescaleTimeline());

        // add handler for resize
        select(window).on("resize", ()=>this.rescaleTimeline());

        // add document listner for dragdrop.
        jQuery(document).on('drag dragstart dragend dragover dragenter dragleave drop', this.selector, (event) => {
            event.preventDefault();
            event.stopPropagation();
        }).on('dragover dragenter', this.selector, () => {
            select(this.selector).classed('bg-info', true);
        }).on('dragleave dragend drop', this.selector, () => {
            select(this.selector).classed('bg-info', false);
        }).on('drop', this.selector, (e) => {
            let files = e.originalEvent.dataTransfer.files;
            if (e.ctrlKey) {
                this.warn("Loading images by drag and drop is disabled in this build.");
                // loadImageFiles(files);
            } else {

                let file = files[0];
                // anon function so we only need to evaluate when its not application/json
                let fext = () => file.name.split(".")[file.name.split(".").length - 1] !== "json";
                if (file.type !== "application/json" || fext()) {
                    this.error(file.name.split(".")[file.name.length - 1]);
                    alert("The file mimetype doesnt match \"application/json\".\nMake sure you know what you are doing.");
                    // bootbox.alert("You provided an invalid file.\nOnly JSON files and images are supported.");
                }

                let reader = new FileReader();
                reader.onload = (e) => {
                    let output = e.target.result;
                    let json = JSON.parse(output);
                    // we only read the first element
                    if (Array.isArray(json)) json = json[0];
                    // using ES6 arrowfuncs means we can access the parent element naturally.
                    this.errorData = {};
                    this.parseOptsIntoMe(json);
                    let o = this.estimateTimelineData(json);
                    this.parseOptsIntoMe(o);
                };
                reader.readAsText(files[0])
            }
        });
    }

    estimateTimelineData(optionData) {
        /**
         * Estimates (pretty well), configuration data for a timelapse.
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
         */

        this.log("Estimating timeline data for ", optionData);

        let start, end;
        if (isDefined(optionData.period)) optionData.period = optionData.period * 1;
        else if (isDefined(optionData.period_in_milliseconds)) optionData.period = optionData.period_in_milliseconds / 1000;
        else if (isDefined(optionData.period_in_seconds)) optionData.period = optionData.period_in_seconds;
        else if (isDefined(optionData.period_in_minutes)) optionData.period = optionData.period_in_minutes * 60;
        else if (isDefined(optionData.period_in_hours)) optionData.period = optionData.period_in_hours * 3600;
        else this.error("FATAL ERROR! No interval/period for timelapse! How many images per second?!?!?");

        optionData.name = optionData.name || optionData.ts_id || optionData.ts_name;
        select(".timeplayer-heading").text(optionData.name);

        if (!isDefined(optionData.default_image)) {
            if (isDefined(optionData.thumbnail)) optionData.default_image = optionData.thumbnail;
            else if (Array.isArray(optionData.thumbnails)) optionData.default_image = optionData.thumbnails[0];
            else this.warn("No default_image or thumbnail parameters in the option data, you wont have a default image. \n(Probably should check up on this btw...");
        }

        if (!isDefined(optionData.webroot) && !isDefined(optionData.webroot_hires)) {
            // bootbox.alert("No webroot was provided for this timestream.");
            this.error("FATAL ERROR! No webroot! Where are my images?!?!?");
        }
        // fixes double slashes and removes trailing slash
        let fixSlashes = (v) => typeof v === "string" ? v.replace(/([^:])\/\/+/g, "$1/").replace(/\/+$/, "") : v;

        // assign webroot to webroot_hires if webroot isnt defined.
        optionData.webroot = isDefined(optionData.webroot) ? fixSlashes(optionData.webroot) : fixSlashes(optionData.webroot_hires);
        optionData.filename = isDefined(optionData.filename) ? optionData.filename : optionData.filename_hires;


        if (!isDefined(optionData.filename) && !isDefined(optionData.filename_hires)) {
            // bootbox.alert("No webroot was provided for this timestream.");
            this.error("FATAL ERROR! No filename! Where are my images?!?!?");
        }

        if (typeof optionData.webroot_hires === "string" && optionData.webroot != optionData.webroot_hires) this.playControlsButtonsData.hiresButton = this.hiresButton;

        let getFilename = (fn, wr) => isDefined(fn) ? fn : wr.split("/").pop();

        this.mapObj = {
            "webroot": optionData.webroot,
            "filename": getFilename(optionData.filename, optionData.webroot),
            "extension": optionData.image_type
        };

        if (isDefined(optionData.webroot_hires) && isDefined(optionData.filename_hires)) {
            this.mapObj.filename_hires = getFilename(optionData.filename_hires, optionData.webroot_hires);
            this.mapObj.webroot_hires = optionData.webroot_hires;
        }


        // get start date
        if (isDefined(optionData.ts_start)) {
            try {
                optionData.start = moment(optionData.ts_start, this.timestreamParse);
            } catch (err) {
                this.warn("Error parsing start to machine readable time (ts_start), check input data.", err)
            }
        }
        if (isDefined(optionData.start_datetime)) {
            try {
                optionData.start = moment(optionData.start_datetime);
            } catch (err) {
                this.warn("Error parsing start to machine readable time (start_datetime), check input data.", err)
            }
        }
        if (isDefined(optionData.posix_start)) {
            try {
                optionData.start = moment.unix(parseFloat(optionData.posix_start));
            } catch (err) {
                this.warn("Error parsing start to machine readable time (posix_start), check input data.", err)
            }
        }
        if (!isDefined(optionData.start)) {
            // bootbox.alert("Couldnt interpret start date from input data. This will fail horribly...");
            this.error("Couldnt interpret start date from input data. This will fail horribly...");
        }

        // get end date
        if (isDefined(optionData.ts_end)) {
            if (optionData.ts_end == "now") {
                optionData.end = moment();
            } else {
                try {
                    optionData.end = moment(optionData.ts_end, this.timestreamParse);
                } catch (err) {
                    this.warn("Error parsing end to machine readable time (ts_end), check input data.", err)
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
                    this.warn("Error parsing end to machine readable time (end_datetime), check input data.", err)
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
                    this.warn("Error parsing end to machine readable time (posix_end), check input data.", err)
                }
            }
        }

        if (!isDefined(optionData.end)) this.warn("Couldnt interpret end date from input data falling back to now.");
        optionData.end = optionData.ongoing ? moment() : optionData.end || moment();
        optionData.start = optionData.start.startOf('day');
        optionData.start = optionData.start.subtract(1, 'day').startOf('day').add(12, 'hours');
        optionData.end = optionData.end.add(1, 'day').startOf('day').add(12, 'hours');

        let rangeStr = "Start: " + optionData.start.format(this.humanFormat) + "\n End: " + optionData.end.format(this.humanFormat);
        jQuery("#timeplayer-datetime-info").attr('title', rangeStr);


        this.numTimePoints = Math.floor(moment.duration(optionData.end.diff(optionData.start)).asSeconds() / optionData.period);

        if (this.numTimePoints > this.reasonableMaxNumTimePoints) {
            let message = "Warning, This timestream might have a large number of images.<br>" +
                "It has " + 3600 / optionData.period + " images per hour for " + Math.floor(moment.duration(optionData.end.diff(optionData.start)).asYears()) + " years total<br>" +
                "This can cause instability.<br>" +
                "Start: " + optionData.start.format(this.timestreamParse) + "<br>" +
                "End:   " + optionData.end.format(this.timestreamParse);
            this.warn(message);
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
        this.parseOptsIntoMe(optionData);

        this.constructTimeline();
        return optionData
    }

    createViewer() {
        // create container
        jQuery("<div id='" + this.viewerId + "'></div>")
            .css("height", "" + this.getRemainingHeight() - 10 + "px")
            .css("width", "100%")
            .appendTo(this.selector);

        jQuery(".panel").css({"margin-bottom": 0, "background-color": "black"});

        this.viewer = OpenSeadragon({
            id: this.viewerId,
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
        // mess up all the functions.
        this.viewer._cancelPendingImages = function () {
            /**
             * Override the this.viewers pending image cancellation as it is too aggressive.
             */
            if (this._loadQueue.length > 5) {
                this._loadQueue = this._loadQueue.slice(this._loadQueue.length - 5, this._loadQueue.length - 1);
            }
        };

        function getOverlayObject(viewer, overlay) {
            /**
             * need to provide an implementation of this for the open override to work correctly as the implementation
             * within OpenSeadragon is private.
             */
            if (overlay instanceof OpenSeadragon.Overlay) {
                return overlay;
            }

            let element = null;
            if (overlay.element) {
                element = OpenSeadragon.getElement(overlay.element);
            } else {
                let id = overlay.id ?
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

            let location = overlay.location;
            let width = overlay.width;
            let height = overlay.height;
            if (!location) {
                let x = overlay.x;
                let y = overlay.y;
                if (overlay.px !== undefined) {
                    let rect = viewer.viewport.imageToViewportRectangle(new OpenSeadragon.Rect(
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

            let placement = overlay.placement;
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

            let failEvent;

            let options = {
                tileSource: tileSource
            };

            let originalSuccess = options.success;

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

            let originalError = options.error;
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
            let t = timer(() => {
                if (this.world._items.length > 2 && this.world._items[1]._hasOpaqueTile) {
                    this.world._items.shift().destroy();
                    if (this.world._items[1]._hasOpaqueTile) t.stop();
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
            let test = document.createElement("img");
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
            this.addErrorForUrl(event.source.url);
        });
    }

    initUI(selector) {
        /**
         * initialises the user interface with the given selector.
         * @param {string} selector - The target selector for the ui to fill. (ie "#timeplayer-control-container"
         */

        /*
         UI BUTTON DATAS & HELPERS
         */

        let self = this;
        select(selector).style("background-color", this.backgroundColor);

        // definee some useful groupings of attributes, classes and their respective values and anonymous functions
        selection.prototype.visibleMobile = function (mobile) {
            return this.classes({
                "hidden-sm-up": mobile,
                "hidden-xs-down": !mobile
            });
        };


        selection.prototype.makeButton = function () {
            return this.classes({"btn": true, 'btn-sm': true, "btn-default": true});
        };

        selection.prototype.makeTooltip = function () {
            return this.attrs({
                "id": (d) => d.id,
                "title": (d) => d.title
            });
        };

        selection.prototype.appendOcticon = function () {
            return this.each(function (d) {
                d.octicon.appendToSelection(select(this), {
                    width: self.dimensions.iconSize,
                    height: self.dimensions.iconSize
                });
            });
        };

        selection.prototype.setIcon = function (wait) {
            if (!this.datum().octiconWait) {
                self.debug("No wait value for icon.");
                return this;
            }
            if (typeof wait === 'undefined') {
                self.debug("No value to toggle icon to.");
                wait = this.select("svg").classed("octicon-" + this.datum().octicon.symbol);
            }
            let target = wait ? this.datum().octiconWait : this.datum().octicon;
            return this.call(() => {
                this.selectAll("*").remove();
                // d.html(target.toSVG({width: dimensions.iconSize, height: dimensions.iconSize}));
                target.appendToSelection(this, {width: self.dimensions.iconSize, height: self.dimensions.iconSize});
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

        select("#timeplayer-controls").remove();
        this.controlsRootEle = select(selector)
            .append("div").attr("id", "timeplayer-controls")
            .styles({
                "width": "100%",
                "position": "absolute",
                "bottom": 0
            })
            .append("div")
            .classed("col-md-12", true);

        if ((this.getRemainingHeight() - 10) > 480) {
            this.controlsRootEle.on("mouseenter", (d) => {
                this.controlsRootEle.transition()
                    .duration(500)
                    .style("opacity", 1.0)
            })
                .on("mouseleave", (d) => {
                    this.controlsRootEle.transition()
                        .delay(500)
                        .duration(3000)
                        .style("opacity", 0.365);
                });
        }

        let timeplayerControlsRow = this.controlsRootEle
            .append("div").attr("id", "timeplayer-controls-row")
            .append("div").classed("form-inline", true);

        let visibleDesktopDiv = timeplayerControlsRow.append("div")
            .visibleMobile(false);

        visibleDesktopDiv.selectAll()
            .data(values(this.playControlsButtonsData)).enter()
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
            .on("click.toggle", function () {
                select(this).setIcon();
            })
            .on("click.cb", (d) => d.clickedCallback(d));

        let snapButton = visibleDesktopDiv.selectAll()
            .data([this.snapButtonData]).enter()
            .append("div")
            .classes({"form-group": true, "dropup": true})
            .styles({
                "display": 'inline-block',
                "margin": "5px 3px"
            })
            .append("button")
            .makeButton().makeTooltip()
            .on("click", (d) => d.clickedCallback(d))
            .style("height", "32px")
            .property("type", "button").text("None");

        let dropDownMenus = visibleDesktopDiv.selectAll()
            .data([this.shareDropdownData]).enter()
            .append("div")
            .classes({
                "form-group": true,
                "dropup": true
            })
            .styles({
                "display": 'inline-block',
                "margin": "5px 3px"
            });

        let ddbutton = dropDownMenus
            .append("button")
            .makeButton().makeTooltip()
            .attr("data-toggle", 'dropdown')
            .property("type", "button")
            .dropdown()
            .appendOcticon();

        dropDownMenus
            .append("ul")
            .attr("role", "menu")
            .classed("dropdown-menu", true)
            .styles({
                "min-width": 0,
                "background-color": "transparent",
                "padding": 0,
                "left": "-4px"
            })
            .selectAll()
            .data((d) => values(d.subButtons)).enter()
            .append("li")
            .append("div").classed("form-group", true)
            .styles({
                "display": 'inline-block',
                "margin": "5px 3px"
            })
            .append("button")
            .makeButton().makeTooltip()
            .on("click", (d) => d.clickedCallback(d))
            .attrs({
                "data-placement": "right",
                "role": "menuitem",
                "tabindex": "-1"
            })
            .appendOcticon();


        let rangeSliderDiv = visibleDesktopDiv.selectAll()
            .data([this.speedSliderData]).enter()
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
            .attr("id", (d) => d.id)
            .rangeSliderAttrs()
            .classed("form-control", true)
            .property("type", "range")
            .on("change", (d) => d.changeCallback(d));

        rangeSliderDiv
            .append("datalist")
            .attr("id", (d) => d.id + "-detents")
            .selectAll().data((d) => d.detents).enter()
            .append("option").attr("value", (d) => d);

        // buttons and sliders that are only visible on mobile
        let mobileVisibleDiv = timeplayerControlsRow.append("div")
            .visibleMobile(true)
            .style("display", "flex");

        mobileVisibleDiv.selectAll()
            .data(values(this.playControlsButtonsData)).enter()
            .append("div").classed("form-group", true).style("display", "inline-block")
            .append("button")
            .makeButton().makeTooltip()
            .attr("id", (d) => d.id + "-sm")
            .property("type", "button")
            .on("click", (d) => d.clickedCallback(d))
            .appendOcticon();

        // add mobile slider.
        mobileVisibleDiv.selectAll()
            .data([this.speedSliderData]).enter()
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
            .on("change", (d) => d.changeCallback(d))
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
    }

    constructTimeline() {

        this.initUI(this.selector);
        this.dimensions.timelineWidth = this.timeplayerTimelineEle.node().getBoundingClientRect().width;

        select("#timeplayer-timeline").selectAll("*").remove();
        this.gradientData = range(0, this.dimensions.timelineWidth).map((i) => ({index: i}));
        this.gradientData_swap = range(0, this.dimensions.timelineWidth).map((i) => ({index: i}));

        let s = this.start.clone(),
            e = this.end.clone().subtract(this.period, "seconds");
        let dataExtent = extent([s, e]);

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
            .rangeRound([0, this.dimensions.timelineWidth])
            .clamp(true);

        this.topXscale = scaleTime()
            .domain(dataExtent)
            .rangeRound([0, this.dimensions.timelineWidth]);

        this.topYscale = scaleBand()
            .domain([this.name])
            .rangeRound([this.dimensions.axisHeight / 2, this.dimensions.topHeight]);

        this.botYscale = scaleBand()
            .domain([this.name])
            .rangeRound([this.dimensions.axisHeight / 2, this.dimensions.bottomHeight]);

        this.offsetScale = scaleLinear()
            .domain([0, this.dimensions.timelineWidth])
            .range([0, 1]);

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
        this.createElements(dataExtent);
    }

    createElements(dataExtent) {
        select("#timeplayer-timeline").selectAll("*").remove();
        this.svg = select("#timeplayer-timeline")
            .append("svg")
            .attrs({
                "width": this.dimensions.timelineWidth,
                "height": this.dimensions.timelineHeight
            });

        this.botAxisEle = this.svg.append("g")
            .classes({
                "x": true,
                "axis": true,
                "botaxis": true
            })
            .attrs({
                "transform": "translate(0," + this.dimensions.botAxisY + ")",
                "height": this.dimensions.axisHeight
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
                "transform": "translate(0," + (this.dimensions.topY) + ")"
            })
            .style("user-select", "none")
            .call(this.xAxisTop);

        this.svg.selectAll(".topaxis text")
            .attrs({
                "y": 0, "x": 0,
                'dy': "-1.2em",
                "transform": "rotate(45)"
            });

        let sliderDragged = (x) => {
            let t = this.topXscale.invert(x);
            this.updatePlayer(t);
        };

        this.clipPath = this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attrs({
                "width": this.dimensions.timelineWidth,
                "height": this.dimensions.timelineHeight
            });

        this.topGroup = this.svg.append("g")
            .attrs({
                "width": this.dimensions.timelineWidth,
                "height": this.dimensions.topHeight,
                "transform": "translate(0," + this.dimensions.topY + ")"
            })
            .classed("top", true);

        this.botGroup = this.svg.append("g")
            .attrs({
                "width": this.dimensions.timelineWidth,
                "height": this.dimensions.bottomHeight,
                "transform": "translate(0," + this.dimensions.botY + ")"
            })
            .classed("bot", true);

        this.topLineEle = this.topGroup.append("g").selectAll(".topLineItems")
            .data(this.lines_mapped).enter().append("path")
            .classed("topLines", true)
            .attrs({
                "d": (d) => this.topLine(d.values),
                "stroke": "url(#topLineGradient)"
            })
            .style("stroke-width", this.dimensions.topHeight * 0.75);

        this.botLineEle = this.botGroup.append("g").selectAll(".bottomLineItems")
            .data(this.lines_mapped).enter().append("path")
            .classed("bottomLines", true)
            .attrs({
                "d": (d) => this.botLine(d.values),
                "stroke": "url(#botLineGradient)"
            })
            .style("stroke-width", this.dimensions.bottomHeight * 0.5);

        this.botLineGradient = this.svg.append("linearGradient")
            .attrs({
                "id": "botLineGradient",
                "gradientUnits": "userSpaceOnUse",
                "x1": 0,
                "y1": 0,
                "x2": this.dimensions.timelineWidth,
                "y2": 0
            });

        this.botLineGradientStopsData = this.botLineGradient.selectAll("stop")
            .data(this.gradientData, (d) => d.index);

        this.botLineGradientStops = this.botLineGradientStopsData.enter()
            .append("stop")
            .attrs({
                'd': (d) => d.index,
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
                "x2": this.dimensions.timelineWidth,
                "y2": 0
            });

        this.topLineGradientStopsData = this.topLineGradient.selectAll("stop")
            .data(this.gradientData, (d) => d.index);

        this.topLineGradientStops = this.topLineGradientStopsData.enter()
            .append("stop")
            .attrs({
                'd': (d) => d.index,
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
                "width": this.dimensions.timelineWidth,
                "height": this.dimensions.bottomHeight + this.dimensions.topHeight,
                "transform": "translate(0," + this.dimensions.topY + ")"
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

        let sliderDrag = drag()
            .on("start.interrupt", () => this.topAxisSlider.interrupt())
            .on("start drag", () => {
                sliderDragged(event.x);
                if (this.playing == true) {
                    this.playing = false;
                    this.updatePlayState();
                }
            });

        this.topAxisDragger = this.svg.append("rect")
            .classed("topaxisbg", true)
            .style("fill", "transparent")
            .attrs({
                "height": () => this.dimensions.axisHeight + this.dimensions.topHeight,
                "width": () => this.dimensions.timelineWidth,
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
                "y1": this.dimensions.topAxisY + this.dimensions.axisHeight,
                "y2": this.dimensions.botY
            });

        let topAxisSliderHandleRadius = () => -3 + this.dimensions.axisHeight / 2;
        this.topAxisSliderHandle = this.topAxisSlider.append("circle")
            .attrs({
                "r": topAxisSliderHandleRadius,
                "cy": (d) => parseFloat(this.topAxisSliderTimeLine.attr("y1")) - parseFloat(topAxisSliderHandleRadius())
            });

        this.bottomBrush = brushX()
            .extent([[0, 0], [this.dimensions.timelineWidth, this.dimensions.bottomHeight + this.dimensions.axisHeight]])
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
            .on("brush", () => {
                /**
                 * function called when the bottom half of the timeline is brushed.
                 */
                if (!event.sourceEvent) return; // Only transition after input.
                if (!event.selection) return; // Ignore empty selections.

                if (typeof event !== 'undefined' && event.sourceEvent !== null) {
                    this.updateAxisScales();
                }
            })
            .on("end", () => {
                /**
                 * function called after the bottom half of the time line has been brushed.
                 * performs the snapping operations.
                 */
                if (!event.sourceEvent) return; // Only transition after input.
                // if (!event.selection) return; // Ignore empty selections.
                if (typeof event !== 'undefined' && event.sourceEvent) {
                    if (event.selection === null && brushSelection(this.bottomBrushGroup.node()) === null)
                        this.snapTo(this.snapping == "None" ? "Month" : this.snapping);
                    else
                        this.snapTo(null);
                }
            });

        this.bottomBrushGroup = this.svg.append("g")
            .attrs({
                "height": this.dimensions.bottomHeight,
                "width": this.dimensions.timelineWidth,
                "transform": "translate(0," + this.dimensions.botY + ")",
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
                "fill-opacity": .5
            })
            .attrs({
                "transform": (d, i) => "translate(" + (i ? 0 : -25) + ",0)",
                "width": 25
            });

        this.bottomBrushGroup.selectAll("rect.selection").style("fill", "white");

        this.bottomBrushGroup.selectAll("rect")
            .attrs({
                "y": 0,
                "height": this.dimensions.bottomHeight + this.dimensions.axisHeight
            });

        this.bottomBrushGroup.call(this.bottomBrush.move, dataExtent.map(this.botXscale));
        sliderDragged(this.dimensions.timelineWidth / 2);
        this.rescaleTimeline();
        this.redrawPaths();
        this.updateAxisScales();
        this.loadURLParams();
    };

    addErrorAtIndex(index) {
        /**
         * adds an error to the error data at the specified index
         * @param {number} index - index to add an error at
         */
        this.errorData[index] = {error: true};
        this.updateGradients();
        this.updateSliderColors(this.currentFrameIndex)
    }

    addSuccessAtIndex(index) {
        /**
         * adds a successful image load to the error data at the specified index
         * @param {number} index - index to add a success at
         */
        this.errorData[index] = {error: false};
        this.updateGradients();
        this.updateSliderColors(this.currentFrameIndex)

    }

    clearAtIndex(index) {
        /**
         * Removes all error data at a specific index.
         * this includes any information about whether the image has been loaded.
         * @param {number} index - index to remove all errordata at.
         */
        delete this.errorData[index];
        // q.defer(updateGradients);
        this.updateGradients();
        this.updateSliderColors(this.currentFrameIndex)
    }

    addErrorForUrl(url) {
        /**
         * the same as "addErrorAtIndex" however accepts a url that is a tilesource for the this.viewer.
         * This is a helper function to map back from image load failed events to meaningful time data to mark the
         * gradients.
         * @param {string} - url to add an error at
         */
        let m = moment(url, this.replaceUrl(this.timestreamFormat));
        this.addErrorAtIndex(this.timeToIndex(m.toDate()));
    }

    addSuccessForUrl(url) {
        /**
         * the same as "addErrorForUrl" except that it adds a successful load instead of an error
         * @param {string} - url to add a success at
         */
        let m = moment(url, this.replaceUrl(this.timestreamFormat));
        this.addSuccessAtIndex(this.timeToIndex(m.toDate()));
    }

    updateInfoBox(){
        let status = moment(this.timeToIndex.invert(this.currentFrameIndex)).format(this.humanFormat) +" "+this.viewer.imageLoader.jobsInProgress+(this.hires?"@hires" :"@lores");
        select("#timeplayer-datetime-info").text(status);
    }

    preloadOmni() {
        /**
         * Triggers preload of the images at the current time resolution ordered from the time cursor out.
         * Uses timer() to await the jobs so as to not block the browser.
         */
        this.debug("Preload start...");

        this.viewer.imageLoader.clear();
        let [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);

        this.loaded = false;
        this.reloadTimeresTicks();

        let imagesToLoad = this.scaleToPreloadTicks.map((d, i) => {
            let idx = this.timeToIndex(d);
            return {
                datetime: d,
                url: this.viewer.tileSources[0].userData.getUrl(idx),
                index: this.timeToIndex(this.scaleToPreload.invert(i))
            };
        });

        let middleMoment = moment(this.timeToIndex.invert(this.currentFrameIndex));

        imagesToLoad.sort((a, b) => Math.abs(moment(a.datetime).diff(middleMoment)) - Math.abs(moment(b.datetime).diff(middleMoment)));
        this.debug("Image loading begins...");
        // var currentLevel = this.viewer.viewport.viewportToImageZoom(this.viewer.viewport.getZoom())<0.5?0:1;
        imagesToLoad.forEach((d) => {
            this.viewer.imageLoader.addJob({
                // src: d.levels[currentLevel].url,
                src: d.url,
                crossOriginPolicy: false,
                callback: (img, message) => {
                    if (message) this.log(message);
                    if (img) this.addSuccessAtIndex(this.timeToIndex(d.datetime));
                    else this.addErrorAtIndex(this.timeToIndex(d.datetime));
                }
            });
        });
        let t = timer(() => {
            select("#loadingStop").attr("offset", () => Math.floor((this.viewer.imageLoader.jobsInProgress / this.preloadAmount) * 100) + "%");
            this.updateInfoBox();
            if (this.viewer.imageLoader.jobsInProgress === 0) {
                this.loaded = true;
                select("#" + this.playControlsButtonsData.omniPreloadButton.id).setIcon(false);
            }
            if (this.loaded) t.stop();
        });
    }

    preloadOne(index) {
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
                if (message) this.log(message);
                if (img) this.addSuccessAtIndex(index);
                else this.addErrorAtIndex(index);
            }
        });
    }

    preloadForward() {
        /**
         * preloads all the images currently in the selected range from the beginning, as opposed to loading from the
         * current location of the time cursor
         */
        this.loaded = false;
        this.reloadTimeresTicks();
        // var currentLevel = this.viewer.viewport.viewportToImageZoom(this.viewer.viewport.getZoom()) < 0.5 ? 0 : 1;
        let imagesToLoad = this.scaleToPreloadTicks.map((d, i) => {
            let idx = this.timeToIndex(d);
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
                    if (message) this.log(message);
                    if (img) this.addSuccessAtIndex(this.timeToIndex(d.datetime));
                    else this.addErrorAtIndex(this.timeToIndex(d.datetime));
                }
            });
        });

        let t = timer(() => {
            select("#loadingStop").attr("offset", () => Math.floor((this.viewer.imageLoader.jobsInProgress / this.preloadAmount) * 100) + "%");
            this.updateInfoBox();
            if (this.viewer.imageLoader.jobsInProgress === 0) {
                this.loaded = true;
            }
            if (this.loaded) t.stop();
        });
    }

    frameChange(index) {
        /**
         * makes the this.viewer change frame.
         * wont attempt to change to a frame that is known to be non-existent
         * @param {number} index - index of the target frame.
         */
        if (!isDefined(this.errorData[index]) || !this.errorData[index].error)
            this.viewer.goToPage(index);
    }

    beginPlay(index) {
        /**
         * begins playing from the index provided.
         * @param {number} index - index of the frame to start from.
         */
        let last = 0;
        console.log("play");
        let [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert),
            diffamt = Math.abs(moment(minExtent).diff(moment(maxExtent))),
            lastTime = this.timeToIndex.invert(index);

        this.updatePlayer(lastTime);

        let t = timer((elapsed) => {
            let [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
                [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);
            if (x0 == x1) [minExtent, maxExtent] = [0, this.timeToIndex(this.end)];

            // var startAdd = startingFrame < extents[0] || startingFrame > extents[1] ? extents[0] : startingFrame;

            let msToAdd = (this.speedMultiplier * (elapsed - last));
            let d = moment(lastTime).add(msToAdd, 'ms').toDate();

            if (d >= maxExtent) {
                this.playing = false;
                this.updatePlayState();
            }
            let func = null;
            if (msToAdd < 60 * 1000) func = time.timeSecond.round;
            else if (msToAdd > 60 * 1000 && msToAdd < 60 * 60 * 1000) func = time.timeMinute.round;
            else if (msToAdd > 60 * 60 * 1000 && msToAdd < 24 * 60 * 60 * 1000) func = time.timeHour.round;
            else if (msToAdd > 24 * 60 * 60 * 1000 && msToAdd < 7 * 24 * 60 * 60 * 1000) func = time.timeDay.round;
            else func = time.timeWeek.round;
            this.updatePlayer(func(d));
            lastTime = d;
            last = elapsed;
            if (!this.playing) t.stop();
        });
    }

    updatePlayer(input, immediate = false) {
        /**
         * updates the state of the player.
         * changes frame to desired and snaps the frame to the correct time resolution, to avoid loading too may images.
         * @param {number|Date} input - either an numeric index or a Date object (or a moment)
         */
        let index, the_time;
        let dom = this.scaleToPreload.domain(),
            domt = [this.timeToIndex(dom[0]), this.timeToIndex(dom[1])],
            originalinput = input;

        if (!isNumeric(input)) input = this.timeToIndex(input);

        if (input > domt[0] && input < domt[1])
            the_time = this.scaleToPreloadTicks[Math.round(input.map(domt[0], domt[1], 0, this.scaleToPreloadTicks.length - 1))];
        else
            the_time = originalinput;

        index = this.timeToIndex(the_time);
        if (index != this.currentFrameIndex || immediate) {
            this.frameChange(index);
            this.currentFrameIndex = index;
        }
        // snappy slider.
        // updateSliderX(this.topXscale(time), index);
        // smooth slider
        this.updateSliderX(this.topXscale(this.timeToIndex.invert(input)), index);
        this.updateSliderColors(index);
        this.updateInfoBox();
    }

    updatePlayState() {
        /**
         * updates the play state
         * whenever the a play state event is triggered, this should be called to inform the player of what state
         * it is meant to be in (idle, loading, playing etc).
         */
        this.viewer.imageLoader.clear();

        select("#" + this.playControlsButtonsData.playButton.id)
            .setIcon(this.playing);

        if (this.playing) {
            this.preloadForward(this.currentFrameIndex);

            let jobs = this.viewer.imageLoader.jobsInProgress;
            let t = timer(() => {
                if (this.viewer.imageLoader.jobsInProgress === 0) {
                    this.loaded = true;
                    this.beginPlay(this.currentFrameIndex);
                }
                if (this.loaded) t.stop();
            });
        } else {
            this.loaded = !this.loaded;
        }
    }

    togglePlay() {
        /**
         * toggles play mode, provided as an example..
         * @type {boolean}
         */
        this.playing = !this.playing;
        this.updatePlayState();
    }

    snapTo(targetSnapping) {
        /**
         * snaps to the snapping interval defined by this.snapping
         */
        let func = this.snapButtonData.choices.get(this.snapping);
        if (targetSnapping !== null) func = this.snapButtonData.choices.get(targetSnapping);
        this.log("Snapping to " + String(targetSnapping || this.snapping));

        if (isDefined(event.sourceEvent) && event.sourceEvent.type === 'end') return;
        if (!isDefined(func) || func == "None") return;


        let brushArea = brushSelection(this.bottomBrushGroup.node());
        if (brushArea === null && event.sourceEvent) brushArea = [event.sourceEvent.layerX, event.sourceEvent.layerX + 1];
        let [x0, x1] = brushArea,
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert),
            [minRounded, maxRounded] = [minExtent, maxExtent].map(func.round);
        // this.bottomBrushGroup.call(this.bottomBrush.move, brushArea);

        // if empty when rounded, use floor & ceil instead
        if (minRounded >= maxRounded) {
            minRounded = func.floor(minExtent);
            maxRounded = func.ceil(maxExtent);
        }


        this.bottomBrush.move(this.bottomBrushGroup, [x0, x1]);
        this.bottomBrushGroup.transition().duration(2000)
            .on("end", () => this.updateAxisScales())
            .call(this.bottomBrush.move, [minRounded, maxRounded].map(this.botXscale))
            .call(this.updateAxisScales);

    }

    bottomBrushed() {
        /**
         * function called when the bottom half of the timeline is brushed.
         */
        if (!event.sourceEvent) return; // Only transition after input.
        if (!event.selection) return; // Ignore empty selections.

        if (typeof event !== 'undefined' && event.sourceEvent !== null) {
            this.updateAxisScales();
        }
    }

    bottomBrushEnded() {
        /**
         * function called after the bottom half of the time line has been brushed.
         * performs the snapping operations.
         */
        if (!event.sourceEvent) return; // Only transition after input.
        // if (!event.selection) return; // Ignore empty selections.
        if (typeof event !== 'undefined' && event.sourceEvent) {
            if (event.selection === null && brushSelection(this.bottomBrushGroup.node()) === null) {
                let v = this.snapping == "None" ? "Month" : this.snapping;
                this.snapTo(v);
            } else {
                this.snapTo(null);
            }
        }
    }

    updateSliderColors(index) {
        /**
         * Updates the colours used in the top slider handle.
         * @param {number} index - what index the slider is at.
         */
        let dat = this.errorData[index];
        this.topAxisSliderHandle
            .attr("fill", (d) => hsl(this.colorSelect(this.name)))
            .attr("fill-opacity", (d) => !isDefined(dat) ? 0.365 : (dat.error ? 0 : 0.8));
    }

    updateSliderX(topXvalue, index) {
        /**
         * updates the position of the slider handle and calls the function to update the colour of the handle
         * topXvalue is the actual pixel location of the slider, while index is optional
         * @param {number} topXvalue - desired x pixel location of the center of the slider handle
         * @param {number} index - index of frame, can be provided so that the extra calculation isnt neccesary.
         */
         index = isDefined(index)? index: this.timeToIndex(this.topXscale.invert(topXvalue));


        this.topAxisSliderHandle.transition().ease(easing.easePolyOut)
            .attr("cx", topXvalue);

        this.topAxisSliderTimeLine.transition().ease(easing.easePolyOut)
            .attr("x1", topXvalue).attr("x2", topXvalue);

    }

    reloadTimeresTicks() {
        /**
         * To avoid loading too much data at once, the timeline must be resampled along time and bucketed reasonably.
         * this function ensures that there is a rounding time scale that performs this function.
         * The rounding scale (scaleToPreload/scaleToPreloadTicks) is also used by the top gradient (line), to determine
         * whether a stop is opaque or transparent.
         */

        let [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);

        let intervals = this.customTimeInterval(minExtent, maxExtent);

        this.scaleToPreload.domain(this.topXscale.domain());
        if (minExtent.getTime() == maxExtent.getTime()) this.scaleToPreload.domain(this.botXscale.domain());

        // this.scaleToPreloadTicks = this.scaleToPreload.ticks(this.preloadAmount);
        this.scaleToPreloadTicks = intervals;

        let zero = this.scaleToPreloadTicks[0],
            one = this.scaleToPreloadTicks[1];
        if (typeof zero == "number") return;
        if (zero.getHours() + zero.getMinutes() + zero.getSeconds() == 0 && one.getHours() + one.getMinutes() + one.getSeconds() == 0) {
            this.scaleToPreloadTicks = this.scaleToPreloadTicks.map(function (d) {
                return new Date(d.getTime() + 1000 * 60 * 60 * 12);
            });
        }
    }

    updateAxisScales() {
        /**
         * updates the scales of both top and bottom time axes.
         * This is done so that whent the bottom time axis is brushed, the top time axis is transformed to match the
         * extents that were brushed.
         */
        if (this === null) return;
        let brushArea = brushSelection(this.bottomBrushGroup.node());
        if (brushArea === null) return;
        let [x0, x1] = brushArea,
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);

        this.topAxisEle
            .call(this.topXscale.domain([minExtent, maxExtent]))
            .call(this.xAxisTop);

        this.svg.selectAll(".topaxis text")
            .attr("transform", "rotate(45)")
            .attr("y", 0).attr("x", 5)
            .attr("dy", "-1.1em")
            .style("text-anchor", "end");

        this.topAxisSliderHandle.attr("visibility", "visible");
        this.topAxisSliderTimeLine.attr("visibility", "visible");

        let xval = this.topXscale(this.timeToIndex.invert(this.currentFrameIndex.clamp(
            this.timeToIndex(minExtent), this.timeToIndex(maxExtent))));

        this.topAxisSliderTimeLine.transition().attr("x1", xval).attr("x2", xval);
        this.topAxisSliderHandle.transition().attr("cx", xval);

        this.reloadTimeresTicks();

        // modify the this.gradientData to be indicative of the timescale, give "datapoint" as reference tick.
        let ticks = scaleTime()
            .domain(this.botXscale.domain())
            .rangeRound([0, this.gradientData.length]).ticks(this.gradientData.length);

        this.gradientData.forEach((d, i) => {
            d.datapoint = this.timeToIndex(this.scaleToPreloadTicks[Math.floor((this.scaleToPreloadTicks.length) * i / this.gradientData.length)]);
            d.loresd = this.timeToIndex(ticks[Math.floor((ticks.length) * i / this.gradientData.length)]);
        });
        this.updateGradients();
    }

    updateGradients() {
        /**
         * updates the gradients (lines) on the timeline to represent the current load state of images.
         */
        this.topLineGradientStops.data(this.gradientData, (d) => d.index)
        // .transition()
            .attr("offset", (d) => this.offsetScale(d.index))
            .attr("stop-opacity", (d) => {
                if (!isDefined(this.errorData[d.datapoint])) return 0.3;
                return this.errorData[d.datapoint].error ? 0.0 : 1.0;
            });

        // rather than break the path, make the gradient stop opacity 0.
        this.botLineGradientStops.data(this.gradientData, (d) => d.index)
        // .transition()
            .attr("offset", (d) => this.offsetScale(d.index))
            .attr("stop-opacity", (d) => {
                // var idx = this.timeToIndex(this.botXscale.invert(d.loresd));
                if (!isDefined(this.errorData[d.loresd])) return 0.3;
                return this.errorData[d.loresd].error ? 0.0 : 1.0;
            });

    }

    rescaleTimeline() {
        select("#openseadragon-this.viewer").transition().style("height", String(this.getRemainingHeight() - 10) + "px");
        this.log("rescaling");
        // dimensions.timelineWidth = jQuery("#timeplayer-timeline").width() || jQuery(window).width();

        // if (this.viewer.isFullPage()) {
        //     dimensions.timelineWidth = jQuery(window).width() - 100;
        // }
        this.dimensions.timelineWidth = this.timeplayerTimelineEle.node().getBoundingClientRect().width;
        this.botXscale
            .rangeRound([0, this.dimensions.timelineWidth]);
        this.topXscale
            .rangeRound([0, this.dimensions.timelineWidth]);

        this.xAxis.scale(this.botXscale);
        this.xAxisTop.scale(this.topXscale);

        this.offsetScale = scaleLinear()
            .domain([0, this.dimensions.timelineWidth])
            .range([0, 1]);

        this.botAxisEle.transition()
            .call(this.xAxis)
            .selectAll(".botaxis text")
            .attr("dy", "1em").attr("transform", "rotate(45)")
            .style("text-anchor", "start");


        this.svg.transition()
            .attr("width", this.dimensions.timelineWidth)
            .attr("width", this.dimensions.timelineWidth);

        this.clipPath.transition()
            .attr("width", this.dimensions.timelineWidth)
            .attr("height", this.dimensions.timelineHeight);

        this.topGroup.transition()
            .attr("width", this.dimensions.timelineWidth)
            .attr("height", this.dimensions.topHeight);

        this.botGroup.transition()
            .attr("width", this.dimensions.timelineWidth)
            .attr("height", this.dimensions.bottomHeight);


        this.topAxisDragger.transition()
            .attr("height", this.dimensions.axisHeight + this.dimensions.topHeight)
            .attr("width", this.dimensions.timelineWidth)

        selectAll(".background")
            .attr("width", this.dimensions.timelineWidth);


        this.bottomBrush.extent([[0, 0], [this.dimensions.timelineWidth, this.dimensions.bottomHeight + this.dimensions.axisHeight]]);
        this.bottomBrushGroup.call(this.bottomBrush);

        // recalculate
        this.gradientData = range(0, this.dimensions.timelineWidth).map((i) => ({index: i}));
        this.gradientData_swap = range(0, this.dimensions.timelineWidth).map((i) => ({index: i}));


        let s1 = this.botLineGradientStops.data(this.gradientData, (d) => d.index);
        s1.enter()
            .append("stop")
            .attrs({
                "d": (d) => d.index,
                "offset": (d) => this.offsetScale(d.index),
                "stop-color": (d) => this.colorSelect(this.name),
                "stop-opacity": 0.3
            });
        s1.exit().remove();
        let s2 = this.topLineGradientStops.data(this.gradientData, (d) => d.index);
        s2.enter()
            .append("stop")
            .attrs({
                "d": (d) => d.index,
                "offset": (d) => this.offsetScale(d.index),
                "stop-color": (d) => this.colorSelect(this.name),
                "stop-opacity": 0.3
            });
        s2.exit().remove();

        this.botLineGradientStops = this.botLineGradient.selectAll("stop");
        this.topLineGradientStops = this.topLineGradient.selectAll("stop");
        this.topLineGradientStops.sort((a, b) => ascending(a.index, b.index));
        this.botLineGradientStops.sort((a, b) => ascending(a.index, b.index));

        if (this.bottomBrushGroup !== null) {
            let [x0, x1] = brushSelection(this.bottomBrushGroup.node());

            [x0, x1] = [Math.max(0, x0), Math.min(x1, this.dimensions.timelineWidth)];

            // this.bottomBrush.move(this.bottomBrushGroup, [x0, x1]);
            this.bottomBrushGroup.transition().duration(1000)
                .call(this.bottomBrush.move, [x0, x1]);
        }

        this.redrawPaths();
        this.updateAxisScales();
        this.updateGradients();
    }

    redrawPaths() {
        this.topLineGradient
            .attrs({"x2": this.dimensions.timelineWidth, "y2": 0});
        this.botLineGradient
            .attrs({"x2": this.dimensions.timelineWidth, "y2": 0});

        this.topLineEle.data(this.lines_mapped).attr("d", (d) => this.topLine(d.values));
        this.botLineEle.data(this.lines_mapped).attr("d", (d) => this.botLine(d.values));
    }


    loadDefaultImage() {
        let idx = Math.floor(this.timeToIndex(this.end) / 2);
        this.updatePlayer(idx);
        if (this.default_image) {
            this.debug("Loading default image ", this.default_image);
            this.viewer.open({
                type: 'image',
                url: this.default_image
            });
        }
        else {
            this.log("default_image requested and not included in this object.");
        }
    }

    getURLParams() {
        let pos = location.href.indexOf("?");
        if (pos == -1) return [];
        let query = location.href.substr(pos + 1);
        let result = {};
        query.split("&").forEach((part) => {
            if (!part) return;
            part = part.split("+").join(" "); // replace every + with space, regexp-free version
            let eq = part.indexOf("=");
            let key = eq > -1 ? part.substr(0, eq) : part;
            let val = eq > -1 ? decodeURIComponent(part.substr(eq + 1)) : "";
            let from = key.indexOf("[");
            if (from == -1) result[decodeURIComponent(key)] = val;
            else {
                let to = key.indexOf("]");
                let index = decodeURIComponent(key.substring(from + 1, to));
                key = decodeURIComponent(key.substring(0, from));
                if (!result[key]) result[key] = [];
                if (!index) result[key].push(val);
                else result[key][index] = val;
            }
        });
        return result;
    }

    loadParamsFromObject(params) {
        this.debug("Loading params", params);
        if (isDefined(params.x) &&
            isDefined(params.y) &&
            isDefined(params.z)) {
            this.viewer.addOnceHandler("open", () => {
                let p = new OpenSeadragon.Point(+params.x, +params.y);
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
            this.updateSpeedSliderTooltips();
            select("#" + this.speedSliderData.id).attr("value", this.speedMultiplier);
        }
        let snapToExtent = [];
        if (isDefined(params.e0) && isDefined(params.e1)) {
            let x0 = moment(params.e0, this.timestreamParse),
                x1 = moment(params.e1, this.timestreamParse);
            snapToExtent = [x0.toDate(), x1.toDate()];
        } else {
            snapToExtent = [this.start.toDate(), this.end.toDate()];
        }

        // this.bottomBrush.move(this.bottomBrushGroup, [x0, x1]);
        this.bottomBrushGroup.call(this.bottomBrush.move, snapToExtent.map(this.botXscale));
        this.updateAxisScales();
        // this.bottomBrushGroup.transition().call(this.bottomBrush.move, snapToExtent.map(this.botXscale));

        if (isDefined(params.i)) {
            // add open handler.
            this.viewer.addHandler('open', (event) => this.addSuccessForUrl(event.source.url));
            let m = moment(params.i, this.timestreamParse);
            let index = this.timeToIndex(m.toDate());
            this.log("opening", index);
            timeout(()=>{
                this.frameChange(index);
                this.currentFrameIndex = index;
                this.updateSliderX(this.topXscale(this.timeToIndex.invert(index)), index);
                this.updateSliderColors(index);
                this.updateInfoBox();
            }, 250);

        } else {
            this.viewer.addOnceHandler('open', () => {
                // this just ignores the first event and binds to any consecutive events.
                this.viewer.addHandler('open', (event) => this.addSuccessForUrl(event.source.url));
            });
            timeout(()=>{
                this.loadDefaultImage();
            }, 250);
        }
    }

    loadURLParams() {
        this.loadParamsFromObject(this.getURLParams());
    }

    getNewParams() {
        let point = this.viewer.viewport.viewportToImageCoordinates(this.viewer.viewport.getBounds().getCenter());
        // let point = this.viewer.viewport.getBounds().getCenter();
        let [x0, x1] = brushSelection(this.bottomBrushGroup.node()),
            [minExtent, maxExtent] = [x0, x1].map(this.botXscale.invert);

        let params = {
            "i": moment(this.timeToIndex.invert(this.viewer.currentPage())).format(this.timestreamParse),
            "e0": moment(minExtent).format(this.timestreamParse),
            "e1": moment(maxExtent).format(this.timestreamParse),
            "x": parseInt(point.x),
            "y": parseInt(point.y),
            "z": this.viewer.viewport.viewportToImageZoom(this.viewer.viewport.getZoom(false)),
            "s": this.speedMultiplier
            // "z": this.viewer.viewport.getZoom(false)
        };
        return "?" + Object.keys(params).map(function (prop) {
                return [prop, params[prop]].map(encodeURIComponent).join("=");
            }).join("&");
    }

    getURLParamsForCopy() {
        // window.location = window.location.pathname + this.getNewParams();
        // window.history.replaceState(null, null, window.location.pathname + this.getNewParams());
        return window.location.host + window.location.pathname + this.getNewParams();
    }

    getEmbedTag() {
        return '<embed width="' + Math.floor(this.dimensions.timelineWidth) + '" height="' + Math.floor(this.getRemainingHeight()) + '" src="https://traitcapture.org' + window.location.pathname.replace("timestreams", "timestreams-embed") + this.getNewParams() + '">';
    };

    getDownloadJson() {
        let filename = this.name + ".json";
        let thumbnail = this.default_image.startsWith("/") ? window.location.protocol + "//" + window.location.host + this.default_image : this.default_image;
        let jsonObject = {
            "name": this.name,
            "period": this.period,
            "webroot": this.webroot,
            "webroot_hires": this.webroot_hires,
            "root": this.webroot,
            "root_hires": this.webroot_hires,
            "ts_start": this.start.format(this.timestreamParse),
            "ts_end": this.end.format(this.timestreamParse),
            "width_hires": this.width_hires,
            "height_hires": this.height_hires,
            "image_type": this.image_type,
            "timestreamFormat": this.timestreamFormat,
            "timestreamParse": this.timestreamParse,
            "default_image": this.default_image,
            "thumbnail": this.default_image,
            "ts_version": "2.0"
        };
        this.debug("Exporting object: ", jsonObject);
        let blob = new Blob([JSON.stringify(jsonObject, null, 4)], {type: 'application/json'});
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, filename);
        }
        else {
            let elem = window.document.createElement('a');
            elem.href = window.URL.createObjectURL(blob);
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
    }

    getDownloadImg() {
        let url = this.viewer.world.getItemAt(this.viewer.world.getItemCount() - 1).source.url;
        let filename = url.split("/");
        filename = filename[filename.length];
        let elem = window.document.createElement('a');
        elem.href = url;
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);

    }

    xmlToJson(xml) {
        // Changes XML to JSON
        // https://davidwalsh.name/convert-xml-json
        // modified by Gareth Dunstone

        // Create the return object
        let obj = {};

        if (xml.nodeType == 1) { // element
            // do attributes
            if (xml.attributes.length > 0) {
                obj = {};
                for (let j = 0; j < xml.attributes.length; j++) {
                    let attribute = xml.attributes.item(j);
                    obj[attribute.nodeName] = attribute.nodeValue;
                }
            }
        } else if (xml.nodeType == 3) { // text
            obj = xml.nodeValue;
        }

        // do children
        if (xml.hasChildNodes()) {
            for (let i = 0; i < xml.childNodes.length; i++) {
                let item = xml.childNodes.item(i);
                let nodeName = item.nodeName;
                if (typeof(obj[nodeName]) == "undefined") {
                    obj[nodeName] = this.xmlToJson(item);
                } else {
                    if (typeof(obj[nodeName].push) == "undefined") {
                        let old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(this.xmlToJson(item));
                }
            }
        }
        return obj;
    }

    timecamFormatToTimestreamFormat(configXmlObject) {
        let shittyDateParse = (ds) => {
            try {
                let shittyFormat = "M/D/YYYY h:m:s A";
                return moment(ds, shittyFormat);
            } catch (e) {
                console.log("Couldn't parse your badly formatted datetime. Sucks to be you.", e);
                return moment();
            }
        };

        let timestreamDataObject = {};

        timestreamDataObject.ongoing = configXmlObject.datapresenter.globals.date_end == 'now';
        timestreamDataObject.start_datetime = shittyDateParse(configXmlObject.datapresenter.globals.date_start);
        if (!timestreamDataObject.ongoing) timestreamDataObject.end_datetime = shittyDateParse(configXmlObject.datapresenter.globals.date_end);
        let period_str = configXmlObject.datapresenter.globals.period;
        // match first of these options
        let periodmatch = /(second|minute|hour|day)/;
        // match first digit value of any length
        // get the period interval type or second
        let ptype = (periodmatch.exec(period_str) || ["second"])[0];
        //get the period type
        let period_mult = {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400
        }[ptype];
        let numbermatch = /\d+/;
        // get the actual number involved.
        let periodnum = parseFloat((numbermatch.exec(period_str) || ["300"])[0]);
        timestreamDataObject.period = periodnum * period_mult;
        timestreamDataObject.name = configXmlObject.datapresenter.components.timecam.title;
        timestreamDataObject.delay = 200;
        timestreamDataObject.width = configXmlObject.datapresenter.components.timecam.width;
        timestreamDataObject.height = configXmlObject.datapresenter.components.timecam.height;
        timestreamDataObject.webroot = configXmlObject.datapresenter.components.timecam.url_image_list;
        timestreamDataObject.filename = configXmlObject.datapresenter.components.timecam.stream_name;
        timestreamDataObject.image_type = configXmlObject.datapresenter.components.timecam.image_type.toLowerCase();
        return timestreamDataObject;
    }

    replaceUrl(input_data) {
        return input_data.replace(/webroot|filename|extension/gi, (match) => {
            if (match == 'webroot' && this.hires) match = "webroot_hires";
            if (match == 'filename' && this.hires) match = "filename_hires";
            return this.mapObj[match];
        });
    }

    getRemainingHeight(selector) {
        let s = (!selector) ? select(this.selector).node() : select(selector).node();
        if (typeof s !== 'object' || s == null) return window.innerHeight;
        // if (this.height > remainingHeight) remainingHeight = this.height + dimensions.timelineHeight;
        // return jQuery(window).height() - (s.getBoundingClientRect().top);
        let h = window.innerHeight - (s.getBoundingClientRect().top);
        return Math.max(480, h);
    }

    parseOptsIntoMe(opts) {
        // parse player options
        for (let key in opts) {
            if (opts.hasOwnProperty(key)) this[key] = opts[key];
        }
    }

    createLog() {
        this.debug = console.debug.bind(window.console);
        this.log = console.log.bind(window.console);
        this.warn = console.warn.bind(window.console);
        this.error = console.error.bind(window.console);
    }

    updateSpeedSliderTooltips() {
        let speed = this.speedMultiplier;
        let value = speed + "x normal speed";
        if (speed == 3600) value = "1 hour per second";
        else if (speed == 10080) value = "1 week per minute";
        else if (speed == 43200) value = "1 month per minute";
        jQuery("." + this.speedSliderData.id).attr("title", value);
    };

    customTimeInterval(x0, x1) {
        let scaledMillis = (x1 - x0) / this.preloadAmount;
        for (let interval of intervalSetArray.slice().reverse()) {
            if (interval[0](scaledMillis)) return interval[1](x0, x1);
        }
    }

}

export default ES6Player;

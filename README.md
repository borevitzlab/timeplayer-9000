#TimePlayer-9000

This project aims to be a fully featured html/javascript timelapse 
viewer/player, while only depending on a small number of libraries, and 
keeping the packaged product easy to deploy in new environments.

In `dist` are the closure compiled, minified files:
`timeplayer-9000.cc.min.js` and `timeplayer-9000.cc.min.js.map`

The compiled js file should inline css styles into the \<head\> tags.

To instantiate a viewer one needs to supply options to the timeplayer.
The two main things that need to be supplied are a selector to use on 
the page and source for configuration (which can be provided as options).


```javascript
var player = Timeplayer({
    // your selector on the page
    selector: "#timeplayer",
    
    name: "ExampleTimelapse",
    
    // required: match/replace for image files.
    filename: "ExampleTimelapse-1920",
    
    // optional: hires filename
    filename_hires: "ExampleTimelapse-3840",
    
    // this is a placeholder image, first image to be shown on load.
    default_image: "http://example.com/timelapses/Example-1920/placeholder.jpg",
    
    // required: a webroot (or a hires webroot) are required.
    webroot: "http://example.com/timelapses/Example-1920",
    
    // optional: hires webroot
    webroot_hires: "http://example.com/timelapses/Example-3840",
    
    // required: width and height
    width: 1920,
    height: 1080,
    // optional: hires width and height
    width_hires: 3840,
    height_hires: 2160,
    // image_type is used to determine extension and is cASe SenSitIvE!
    image_type: "jpg",
    
    // the following two fields dictate the way that the player locates 
    // images on the server. they are optional, and these provided are
    // the default.
    
    // timestreamFormat is what is used to find the images
    timestreamFormat: "[webroot]/YYYY/YYYY_MM/YYYY_MM_DD/YYYY_MM_DD_HH/[filename]_YYYY_MM_DD_HH_mm_ss_00.[extension]",
    // timestreamParse is one method used to parse the start/end dates,
    // and to parse url parameters.
    timestreamParse: "YYYY_MM_DD_HH_mm_ss_00",
    
    // this would make our final image request look like this:
    // http://example.com/timelapses/Example-1920/2017/2017_01/2017_01_10/2017_01_10_12/ExampleTimelapse-1920_2017_01_10_12_15_00_00.jpg",
    // and hires: 
    // http://example.com/timelapses/Example-3840/2017/2017_01/2017_01_10/2017_01_10_12/ExampleTimelapse-3840_2017_01_10_12_15_00_00.jpg",
    
    // multiple options are available for start and end dates
    // they are valued like posix_start > start_datetime > ts_start if multiple provided
    // these rely on timestreamParse...
    ts_start: 2017_01_01_12_00_00_00,
    ts_end: 2017_01_20_12_00_00_00,
    
    // these need to be able to be accurately parsed by the moment.js library
    // iso8601 is a great idea...
    start_datetime: "2017-01-01T12:00:00.000+1100",
    end_datetime: "2017-01-20T12:00:00.000+1100",
    
    // also support posix timestamps (seconds since jan 1 1970):
    posix_start: 1483232400, 
    posix_end: 1484874000,
    
    
    // period defaults to parsing seconds, prioritises accuracy if more than one field is provided.
    period: 300,
    period_in_milliseconds: 300000,
    period_in_seconds: 300,
    period_in_minutes: 300*60,
    period_in_hours: 300*60*60,
    
    // ... use a url config source (that provides the same parameters as above)
    url: http://your-url.com/config.json
    
    // also supports xml (albeit with a little bit different parameters, see xml support
    url: http://your-url.com/config.xml
});
```

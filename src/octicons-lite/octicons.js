import * as data from './octicons.json';
import "./octicons.css"

var octiconsArray = Object.keys(data).map((key)=> {
    var o = data[key];
    // Set the symbol for easy access
    o.symbol = key.replace(/-/g,"");
    return o;
}).map((obj) => {
    // Returns a string representation of html attributes
    var htmlAttributes = (icon, options) => {
        var attributes = [];
        var attrObj = Object.assign({}, obj.options, options);

        // If the user passed in options
        if (options) {

            // If any of the width or height is passed in
            if (options["width"] || options["height"]) {
                attrObj["width"] = options["width"] ? options["width"] : (parseInt(options["height"]) * obj.options["width"] / obj.options["height"]);
                attrObj["height"] = options["height"] ? options["height"] : (parseInt(options["width"]) * obj.options["height"] / obj.options["width"]);
            }

            // If the user passed in class
            if (options["class"]) {
                attrObj["class"] = "octicon octicon-" + obj.symbol + " " + options["class"];
                attrObj["class"].trim();
            }

            // If the user passed in aria-label
            if (options["aria-label"]) {
                attrObj["aria-label"] = options["aria-label"];
                attrObj["role"] = "img";

                // Un-hide the icon
                delete attrObj["aria-hidden"];
            }
        }

        Object.keys(attrObj).forEach((option) => attributes.push(option + "=\"" + attrObj[option] + "\""));
        return attributes.join(" ").trim();
    };

    var d3Attributes = (icon, options) => {
        var attributes = [];
        var attrObj = Object.assign({}, obj.options, options);

        // If the user passed in options
        if (options) {

            // If any of the width or height is passed in
            if (options["width"] || options["height"]) {
                attrObj["width"] = options["width"] ? options["width"] : (parseInt(options["height"]) * obj.options["width"] / obj.options["height"]);
                attrObj["height"] = options["height"] ? options["height"] : (parseInt(options["width"]) * obj.options["height"] / obj.options["width"]);

            }

            // If the user passed in class
            if (options["class"]) {
                attrObj["class"] = "octicon octicon-" + obj.symbol + " " + options["class"];
                attrObj["class"].trim();
            }

            // If the user passed in aria-label
            if (options["aria-label"]) {
                attrObj["aria-label"] = options["aria-label"];
                attrObj["role"] = "img";

                // Un-hide the icon
                delete attrObj["aria-hidden"];
            }
        }
        return Object.keys(attrObj).map((option)=>({attrName: option, attrValue: attrObj[option]}));
    };



    // Set all the default options
    obj.options = {
        "version": "1.1",
        "width": obj.width,
        "height": obj.height,
        "viewBox": "0 0 " + obj.width + " " + obj.height,
        "class": "octicon octicon-" + obj.symbol,
        "aria-hidden": "true"
    };

    // Function to return an SVG object
    obj.toSVG = (options) => "<svg " + htmlAttributes(obj, options) + ">" + obj.path + "</svg>";
    // Function to return an SVG object with a use, assuming you use the svg sprite
    obj.toSVGUse = (options) => "<svg " + htmlAttributes(obj, options) + "><use xlink:href=\"#" + obj.symbol + "\" /></svg>";
    obj.appendToSelection = (sel, options) => {
        var g = sel.append("svg");
        d3Attributes(obj, options).forEach((d)=>g.attr(d.attrName, d.attrValue));
        g.html(obj.path);
        return g;
    };


    return obj;
});

var octicons = {};

octiconsArray.forEach((d)=> {
    octicons[d.symbol] = d;
});

export default octicons;


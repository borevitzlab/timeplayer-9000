import resolve from "rollup-plugin-node-resolve";
import babel from 'rollup-plugin-babel';
import postcss from "rollup-plugin-postcss";
import json from "rollup-plugin-json";
import cssnano from "cssnano";

export default {
    useStrict: true,
    entry: "index.js",
    dest: "build/rolled.js",
    sourceMap: 'inline',
    format: "umd",
    moduleName: "TimePlayer",
    plugins: [
        resolve({
            jsnext: true,
            main: true
        }),
        babel({
            exclude: [
                "node_modules/**",
                "**/*.css",
                "**/*.json"
            ]
        }),
        json({
            preferConst: true
        }),
        postcss({
            extensions: ['.css'],
            plugins:[
                cssnano()
            ]
        })
    ]
};

# Seed

Seed files for a client-side web app. Jquery, Backbone and Underscore included. Uses LESS for CSS. Handlebars for JS templating. 

## Installation

1. Grab this code (choose one)
    * fork this repo ([how-to fork](https://help.github.com/articles/fork-a-repo)) 
    * duplicate this repo ([how-to duplicate](https://help.github.com/articles/duplicating-a-repository))
    * Download ZIP
2. npm install
3. gulp build

## Gulp

* gulp build
    * browserify js and put it in 'build' dir - index.js
    * process less files and put in 'build' dir - index.css
    * minify images and copy to 'build' dir
    * minify html and copy to 'build' dir
    * copy fonts to 'build' dir

* gulp watch
    * watch src/js then browserify on changes
    * watch src/less then less on changes
    * watch src/templates then browserify on changes
    * watch src/images then imagemin on changes
    * watch src/.html then htmlmin on changes
    * watch src/fonts then fontcopy on changes
    
* gulp browserify
    * browserify js and put it in 'build' dir - index.js
    
* gulp less
    * process less files and put in 'build' dir - index.css
    
* gulp imagemin
    * minify images and copy to 'build' dir

* gulp htmlmin
    * minify html and copy to 'build' dir
    
* gulp fontcopy
    * copy fonts to 'build' dir
    
* gulp deploy
    * deploy 'build' dir to AWS S3 bucket
    
    Reads aws.json file from root and deploys to S3 bucket. **Important: will overwrite what's in your bucket**
    ```javascript
        {
            "key": "", // aws key
            "secret": "", // aws secret
            "bucket": "" // aws bucket to deploy to
        }
    
    
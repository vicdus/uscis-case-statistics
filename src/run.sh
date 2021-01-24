#!/bin/bash

scriptdir=`dirname "$BASH_SOURCE"`

pushd $scriptdir

git pull

tsc clawer.ts Constants.ts

node clawer.js

git add -A

git commit -m 'update'

git push

npm run deploy
#!/bin/bash

scriptdir=`dirname "$BASH_SOURCE"`

pushd $scriptdir

cd scraper

go run main.go

cd ..

git pull

git add -A

git commit -m 'update'

git push

npm run deploy
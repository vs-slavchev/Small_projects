#!/bin/bash

echo 'Killing old process...'
killall java

echo 'Removing old executable...'
cd ~/repos/MindYou/play-service/target
rm -rf universal

echo 'Started compile task...'
cd ~/repos/MindYou/play-service
sbt compile
echo 'Started dist task...'
sbt dist

echo 'Unziping archive...'
cd ~/repos/MindYou/play-service/target/universal/
unzip play-service-1.0-SNAPSHOT.zip

cd ~
./start_server.sh

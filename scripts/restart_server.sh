#!/bin/bash

echo -e '\e[36mKilling old process...\e[0m'
killall java

echo -e '\e[36mRemoving old executable...\e[0m'
cd ~/repos/MindYou/play-service/target
rm -rf universal

echo -e '\e[36mStarted compile task...\e[0m'
cd ~/repos/MindYou/play-service
sbt compile
echo -e '\e[36mStarted dist task...\e[0m'
sbt dist

echo -e '\e[36mUnziping archive...\e[0m'
cd ~/repos/MindYou/play-service/target/universal/
unzip play-service-1.0-SNAPSHOT.zip

cd ~
./start_server.sh

#!/bin/bash

echo -e '\e[36mArchiving old log file...\e[0m'
new_log_file_name="play_$(date +"%H-%M-%S_%d-%m-%y").log"
cp ~/repos/MindYou/play-service/target/universal/play-service-1.0-SNAPSHOT/bin/logs/application.log ~/logs/$new_log_file_name

echo -e '\e[36mRemoving old repo...\e[0m'
cd ~/repos
rm -rf MindYou
git clone https://github.com/vs-slavchev/MindYou

cd ~
./restart_server.sh


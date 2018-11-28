#!/bin/bash

echo 'Removing old repo...'
cd ~/repos
rm -rf MindYou
git clone https://github.com/vs-slavchev/MindYou

./restart_server.sh

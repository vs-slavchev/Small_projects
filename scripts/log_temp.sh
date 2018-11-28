#!/bin/bash

echo "$(date) - $(vcgencmd measure_temp)" >> ~/temp_log.txt

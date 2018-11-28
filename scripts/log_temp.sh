#!/bin/bash

# 48.0 degrees
threshold=480
while true
do
	temp=$(echo "$(vcgencmd measure_temp)" | sed 's/[^0-9]*//g')
	if [ $temp -gt $threshold ]
	then
		indentation=$(expr $temp - $threshold)
		echo "$(date) => $temp $(printf '=%.0s' $(seq 1 $indentation))" >> ~/temp_log.txt
	fi
sleep 20
done

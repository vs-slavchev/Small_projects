#!/bin/bash

# only record above 28.0 degrees
threshold=280
while true
do
	temp=$(echo "$(vcgencmd measure_temp)" | sed 's/[^0-9]*//g')
	if [ $temp -gt $threshold ]
	then
		indentation=$(expr $temp - $threshold)
		echo "$(date) #$temp" >> ~/temp_log.txt
	fi
sleep 20
done

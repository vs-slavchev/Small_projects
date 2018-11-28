#!/bin/bash

temp=$(echo "$(vcgencmd measure_temp)" | sed 's/[^0-9]*//g')
if [ $temp -gt 520 ]
then
	echo "$(date) => $temp" >> temp_log.txt
fi

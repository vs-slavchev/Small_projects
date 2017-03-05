#!/bin/bash

today="$(date +'%d-%m')"
people=""

while IFS=, read name daymonth
do
    if [ $daymonth == $today ]
    then
	people="$people\n$name"
    fi	
done < birthdays.csv

notify-send -t 10000 "Birthday today" "$people"

#!/bin/bash

run(){
    sleep 8

    today="$(date +'%d-%m')"
    people=""

    while IFS=, read name daymonth
    do
        if [ $daymonth == $today ]
        then
	    people="$people\n$name"
        fi	
    done < "$(dirname -- "$0")/birthdays.csv"

    if [ "$people" != "" ]
    then
        notify-send -t 10000 "Birthday today" "$people"
    fi
}

run &

echo 'Starting server...'
cd ~/repos/MindYou/play-service/target/universal/play-service-1.0-SNAPSHOT/bin
chmod +x play-service
./play-service  -Dplay.http.secret.key='generate secret key and put here'

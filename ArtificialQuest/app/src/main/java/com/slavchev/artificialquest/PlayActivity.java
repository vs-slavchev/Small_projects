package com.slavchev.artificialquest;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.view.View;

import java.util.Locale;

public class PlayActivity extends Activity {

    private TextToSpeech tts;
    private StoryTree storyTree;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_play);
        storyTree = new StoryTree();
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status == TextToSpeech.SUCCESS) {
                    int result = tts.setLanguage(Locale.US);
                    if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                        Log.e("TTS", "This Language is not supported");
                    }
                    tts.setSpeechRate(0.8f);

                    speak("Hello player!");
                    silence(1200);
                    tellDescriptions();
                } else {
                    Log.e("TTS", "Initialization Failed!");
                }
            }
        });
    }

    private void tellDescriptions() {
        speak(storyTree.getStoryText());
        silence(1000);
        speak("You can");
        silence(300);
        for (int path_i = 0; path_i < storyTree.getPathsShortDescriptions().length; path_i++) {
            if (path_i > 0) {
                speak("or");
                silence(300);
            }
            speak(storyTree.getPathsShortDescriptions()[path_i]);
            silence(600);
        }
    }

    private void speak(String text){
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, null);
        } else {
            tts.speak(text, TextToSpeech.QUEUE_ADD, null);
        }
    }

    private void silence(int ms) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            tts.playSilentUtterance(ms, TextToSpeech.QUEUE_ADD, null);
        } else {
            tts.playSilence(ms, TextToSpeech.QUEUE_ADD, null);
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    private void chooseNextStory(int buttonId) {
        if (tts.isSpeaking()) {
            return;
        }
        if (!storyTree.isValidNextStory(buttonId)){
            speak("You cannot go this way.");
        }
        tellDescriptions();
    }

    public void onClickBtFirst(View v) {
        chooseNextStory(1);
    }

    public void onClickBtSecond(View v) {
        chooseNextStory(2);
    }

    public void onClickBtThird(View v) {
        chooseNextStory(3);
    }

    public void onClickBtRepeat(View v) {
        tellDescriptions();
    }
}
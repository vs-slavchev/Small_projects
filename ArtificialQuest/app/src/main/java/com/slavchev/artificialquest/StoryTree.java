package com.slavchev.artificialquest;

public class StoryTree {

    private int storyNodeId = 27;
    private Story story = new Story();

    public boolean isValidNextStory(int button) {
        int choiceIndex = button - 1;
        if (choiceIndex >= getPathsIds().length) {
            return false;
        }
        int newId = getPathsIds()[choiceIndex];
        boolean correct = newId != 0;
        storyNodeId = correct ? newId : storyNodeId;
        return correct;
    }

    public String[] getPathsShortDescriptions() {
        int[] pathIds = getPathsIds();
        String[] descriptions = new String[pathIds.length];
        for (int i = 0; i < pathIds.length; i++) {
            descriptions[i] = story.getPath(pathIds[i]);
        }
        return descriptions;
    }

    public String getStoryText(){
        String text = story.getText(storyNodeId);
        story.visitNode(storyNodeId);
        return text;
    }

    private int[] newPaths(int first, int second, int third) {
        return new int[] {first, second, third};
    }

    private int[] newPaths(int first, int second) {
        return new int[] {first, second};
    }

    public int[] getPathsIds() {
        switch (storyNodeId) {
            case 1:
                return newPaths(2, 3);
            case 2:
                return newPaths(1, 4, 5);
            case 3:
                return newPaths(1, 4, 5);
            case 4:
                return newPaths(2, 3, 11);
            case 5:
                return newPaths(2, 3, 6);
            case 6:
                return newPaths(5, 7);
            case 7:
                return newPaths(6, 8, 9);
            case 8:
                return newPaths(7, 10);
            case 9:
                return newPaths(7, 18, 19);
            case 10:
                return newPaths(8, 11, 12);
            case 11:
                return newPaths(4, 10, 13);
            case 12:
                return newPaths(10, 17);
            case 13:
                return newPaths(11, 14, 15);
            case 14:
                return newPaths(13, 28, 29);
            case 15:
                return newPaths(13, 16);
            case 16:
                return newPaths(15, 18);
            case 17:
                return newPaths(12, 20);
            case 18:
                return newPaths(9, 16);
            case 19:
                return newPaths(9, 21);
            case 20:
                return newPaths(17, 21, 28);
            case 21:
                return newPaths(19, 20, 25);
            case 22:
                return newPaths(23, 29);
            case 23:
                return newPaths(22, 24);
            case 24:
                return newPaths(23, 26);
            case 25:
                return newPaths(21, 27);
            case 26:
                return newPaths(24, 27);
            case 27:
                return newPaths(1, 30);
            case 28:
                return newPaths(14, 20);
            case 29:
                return newPaths(14, 22);
            default:
                return new int[] {};
        }
    }
}

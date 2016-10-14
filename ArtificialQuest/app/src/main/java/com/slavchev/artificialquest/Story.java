package com.slavchev.artificialquest;

import java.util.Set;
import java.util.TreeSet;

public class Story {
    private final int NODES = 31;
    private String[] texts, paths;
    private Set<Integer> visitedNodes;

    public Story() {
        visitedNodes = new TreeSet<>();
        texts = new String[NODES * 2];
        paths = new String[NODES];
        new Texts(this);
    }

    public void visitNode(int nodeId) {
        visitedNodes.add(nodeId);
    }

    public boolean isVisited(int nodeId) {
        return visitedNodes.contains(nodeId);
    }

    public String getText(int storyId) {
        if (nodeIdIsValid(storyId)) {
            if (visitedNodes.contains(storyId)) {
                return getSecondStateText(storyId);
            }
            return texts[storyId];
        }
        return null;
    }

    private String getSecondStateText(int storyId) {
        return texts[storyId + NODES];
    }

    public String getPath(int pathId) {
        if (nodeIdIsValid(pathId)) {
            return "Go to the " + paths[pathId];
        }
        return null;
    }

    private boolean nodeIdIsValid(int storyId) {
        return storyId > 0 && storyId < NODES;
    }

    public void createTexts(int nodeId, String firstState, String secondState, String path) {
        if (nodeId <= 0 || nodeId >= NODES) {
            return;
        }
        texts[nodeId] = firstState;
        texts[nodeId + NODES] = secondState;
        paths[nodeId] = path;
    }
}

from sklearn.datasets import load_iris
from sklearn import tree

iris = load_iris()

clf = tree.DecisionTreeClassifier()
clf.fit(iris.data, iris.target)

print(clf.predict(iris.data[[50]]))

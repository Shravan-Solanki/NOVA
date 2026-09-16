# backend/nodes/__init__.py
# Node registry — maps node type strings to their Python implementation classes
# The executor imports this dict to instantiate the correct class for each node

from nodes.data_loader      import DataLoaderNode
from nodes.train_test_split import TrainTestSplitNode
from nodes.imputer          import ImputerNode
from nodes.scaler           import ScalerNode
from nodes.encoder          import EncoderNode
from nodes.classifier       import ClassifierNode
from nodes.regressor        import RegressorNode
from nodes.evaluator        import EvaluatorNode
from nodes.confusion_matrix import ConfusionMatrixNode

# Keys must exactly match the `type` field in each React Flow node object on the frontend
NODE_REGISTRY = {
    'dataLoader':      DataLoaderNode,
    'trainTestSplit':  TrainTestSplitNode,
    'imputer':         ImputerNode,
    'scaler':          ScalerNode,
    'encoder':         EncoderNode,
    'classifier':      ClassifierNode,
    'regressor':       RegressorNode,
    'evaluator':       EvaluatorNode,
    'confusionMatrix': ConfusionMatrixNode,
}

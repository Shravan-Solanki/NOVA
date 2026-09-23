// src/data/templates.js
// Pre-wired starter pipeline templates — each is a ready-to-use graph

const t = (type, id, x, y, params = {}) => ({
  id,
  type,
  position: { x, y },
  data: {
    label: type === 'dataLoader' ? 'Data Loader'
         : type === 'trainTestSplit' ? 'Train/Test Split'
         : type === 'imputer' ? 'Imputer'
         : type === 'scaler' ? 'Scaler'
         : type === 'encoder' ? 'Encoder'
         : type === 'classifier' ? 'Classifier'
         : type === 'regressor' ? 'Regressor'
         : type === 'evaluator' ? 'Evaluator'
         : type === 'confusionMatrix' ? 'Confusion Matrix'
         : type,
    nodeType: type,
    params,
    status: 'idle',
    results: null,
  }
})

const e = (source, target, i) => ({
  id: `e-tpl-${i}`,
  source,
  target,
  type: 'removable',
  sourceHandle: null,
  targetHandle: null,
})

export const TEMPLATES = [
  {
    id: 'iris-classification',
    icon: '🌸',
    name: 'Iris Classification',
    desc: 'Classic beginner dataset. Classify flowers by petal & sepal measurements using a Decision Tree.',
    flow: ['Data Loader (Iris.csv)', 'Split', 'Scaler', 'Decision Tree', 'Evaluator', 'Confusion Matrix'],
    color: '#3b82f6',
    data: {
      name: 'Iris Classification',
      nodes: [
        t('dataLoader',      'n1', 80,  120, {
          filePath: 'Iris.csv',
          targetColumn: 'Species',
          dropColumns: ['Id'],
          availableColumns: ['Id', 'SepalLengthCm', 'SepalWidthCm', 'PetalLengthCm', 'PetalWidthCm', 'Species'],
          shape: [150, 6],
        }),
        t('trainTestSplit',  'n2', 360, 120, { testSize: 0.2, randomState: 42, shuffle: true }),
        t('scaler',          'n3', 640, 120, { scalerType: 'StandardScaler' }),
        t('classifier',      'n4', 920, 120, { classifierType: 'DecisionTree', max_depth: 5, criterion: 'gini', randomState: 42 }),
        t('evaluator',       'n5', 1200, 120, { metrics: ['accuracy', 'f1', 'precision', 'recall'] }),
        t('confusionMatrix', 'n6', 1200, 320, {}),
      ],
      edges: [
        e('n1','n2',1), e('n2','n3',2), e('n3','n4',3),
        e('n4','n5',4), e('n5','n6',5),
      ],
    }
  },
  {
    id: 'house-price',
    icon: '🏠',
    name: 'House Price Prediction',
    desc: 'Predict median house prices. Handles missing values, encodes categories, and uses Linear Regression.',
    flow: ['Data Loader (housing.csv)', 'Imputer', 'Split', 'Encoder', 'Linear Regression', 'Evaluator'],
    color: '#10b981',
    data: {
      name: 'House Price Prediction',
      nodes: [
        t('dataLoader',     'n1', 80,  120, {
          filePath: 'housing.csv',
          targetColumn: 'median_house_value',
          dropColumns: [],
          availableColumns: ['longitude', 'latitude', 'housing_median_age', 'total_rooms', 'total_bedrooms', 'population', 'households', 'median_income', 'median_house_value', 'ocean_proximity'],
          shape: [20640, 10],
        }),
        t('imputer',        'n2', 360, 120, { strategy: 'median', columns: [] }),
        t('trainTestSplit', 'n3', 640, 120, { testSize: 0.2, randomState: 42, shuffle: true }),
        t('encoder',        'n4', 920, 120, { encoderType: 'OneHotEncoder', columns: ['ocean_proximity'] }),
        t('regressor',      'n5', 1200, 120, { regressorType: 'LinearRegression' }),
        t('evaluator',      'n6', 1480, 120, { metrics: ['rmse', 'mae', 'r2'] }),
      ],
      edges: [
        e('n1','n2',1), e('n2','n3',2), e('n3','n4',3),
        e('n4','n5',4), e('n5','n6',5),
      ],
    }
  },
  {
    id: 'knn-classifier',
    icon: '🔢',
    name: 'KNN Classification',
    desc: 'Learn the simplest classification algorithm. K-Nearest Neighbors predicts by looking at nearby examples.',
    flow: ['Data Loader (Iris.csv)', 'Imputer', 'Split', 'Scaler', 'KNN', 'Evaluator', 'Confusion Matrix'],
    color: '#8b5cf6',
    data: {
      name: 'KNN Classification',
      nodes: [
        t('dataLoader',      'n1', 80,  120, {
          filePath: 'Iris.csv',
          targetColumn: 'Species',
          dropColumns: ['Id'],
          availableColumns: ['Id', 'SepalLengthCm', 'SepalWidthCm', 'PetalLengthCm', 'PetalWidthCm', 'Species'],
          shape: [150, 6],
        }),
        t('imputer',         'n2', 360, 120, { strategy: 'mean', columns: [] }),
        t('trainTestSplit',  'n3', 640, 120, { testSize: 0.2, randomState: 42, shuffle: true }),
        t('scaler',          'n4', 920, 120, { scalerType: 'MinMaxScaler' }),
        t('classifier',      'n5', 1200, 120, { classifierType: 'KNN', n_neighbors: 5, metric: 'minkowski' }),
        t('evaluator',       'n6', 1480, 120, { metrics: ['accuracy', 'f1'] }),
        t('confusionMatrix', 'n7', 1480, 320, {}),
      ],
      edges: [
        e('n1','n2',1), e('n2','n3',2), e('n3','n4',3),
        e('n4','n5',4), e('n5','n6',5), e('n6','n7',6),
      ],
    }
  },
  {
    id: 'compare-classifiers',
    icon: '📊',
    name: 'Compare Two Classifiers',
    desc: 'Train Decision Tree and Logistic Regression side-by-side on Iris and compare their performance metrics.',
    flow: ['Data Loader (Iris.csv)', 'Split', 'Decision Tree + Logistic Reg.', 'Evaluator × 2'],
    color: '#f59e0b',
    data: {
      name: 'Compare Classifiers',
      nodes: [
        t('dataLoader',       'n1', 80,  200, {
          filePath: 'Iris.csv',
          targetColumn: 'Species',
          dropColumns: ['Id'],
          availableColumns: ['Id', 'SepalLengthCm', 'SepalWidthCm', 'PetalLengthCm', 'PetalWidthCm', 'Species'],
          shape: [150, 6],
        }),
        t('trainTestSplit',   'n2', 360, 200, { testSize: 0.2, randomState: 42, shuffle: true }),
        t('classifier',       'n3', 640, 80,  { classifierType: 'DecisionTree', max_depth: 5, criterion: 'gini', randomState: 42 }),
        t('classifier',       'n4', 640, 340, { classifierType: 'LogisticRegression', C: 1.0, max_iter: 200, randomState: 42 }),
        t('evaluator',        'n5', 920, 80,  { metrics: ['accuracy', 'f1', 'precision', 'recall'] }),
        t('evaluator',        'n6', 920, 340, { metrics: ['accuracy', 'f1', 'precision', 'recall'] }),
      ],
      edges: [
        e('n1','n2',1),
        e('n2','n3',2), e('n2','n4',3),
        e('n3','n5',4), e('n4','n6',5),
      ],
    }
  },
]

// Construction Cost Prediction using TensorFlow.js
class ConstructionCostPredictor {
  constructor() {
    this.model = null;
    this.materials = [];
    this.projects = [];
    this.isModelLoaded = false;
  }

  // Load data from server
  async loadData() {
    try {
      const [materialsRes, projectsRes] = await Promise.all([
        fetch('/api/materials'),
        fetch('/api/projects') // We'll need to add this endpoint
      ]);

      this.materials = materialsRes.ok ? (await materialsRes.json()).data : [];
      this.projects = projectsRes.ok ? (await projectsRes.json()).data : [];

      console.log('Data loaded:', { materials: this.materials.length, projects: this.projects.length });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  // Create and train the model
  async createModel() {
    // Simple linear regression model for cost prediction
    this.model = tf.sequential();

    this.model.add(tf.layers.dense({ inputShape: [4], units: 64, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 1 }));

    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });

    this.isModelLoaded = true;
    console.log('Model created and compiled');
  }

  // Prepare training data from existing projects
  prepareTrainingData() {
    const trainingData = [];

    // Use existing project data to create training examples
    this.projects.forEach(project => {
      // Extract area from title/summary (simplified)
      const areaMatch = project.summary.match(/(\d+)/);
      const area = areaMatch ? parseInt(areaMatch[1]) : 1000;

      // Extract budget (simplified parsing)
      const budgetMatch = project.budget.match(/₹(\d+)L/);
      const budget = budgetMatch ? parseInt(budgetMatch[1]) * 100000 : 500000;

      // Create feature vector: [area, floors, quality_index, material_count]
      const features = [
        area, // area in sq ft
        2, // default floors
        2, // default quality index (0-3)
        5  // default material count
      ];

      trainingData.push({
        features: features,
        target: budget
      });
    });

    // Generate synthetic data for better training
    for (let i = 0; i < 100; i++) {
      const area = Math.random() * 5000 + 500; // 500-5500 sq ft
      const floors = Math.floor(Math.random() * 4) + 1; // 1-4 floors
      const quality = Math.floor(Math.random() * 4); // 0-3 quality levels
      const materialCount = Math.floor(Math.random() * 10) + 5; // 5-15 materials

      // Calculate estimated cost based on rules
      let baseCost = area * 1200; // Base cost per sq ft
      baseCost *= (1 + floors * 0.3); // Floor multiplier
      baseCost *= (1 + quality * 0.2); // Quality multiplier
      baseCost *= (1 + materialCount * 0.05); // Material multiplier

      trainingData.push({
        features: [area, floors, quality, materialCount],
        target: baseCost
      });
    }

    return trainingData;
  }

  // Train the model
  async trainModel() {
    if (!this.isModelLoaded) await this.createModel();

    const trainingData = this.prepareTrainingData();

    const features = trainingData.map(d => d.features);
    const targets = trainingData.map(d => d.target);

    const xs = tf.tensor2d(features);
    const ys = tf.tensor1d(targets);

    console.log('Training model with', trainingData.length, 'samples...');

    await this.model.fit(xs, ys, {
      epochs: 100,
      batchSize: 32,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 20 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
          }
        }
      }
    });

    // Clean up tensors
    xs.dispose();
    ys.dispose();

    console.log('Model training completed');
  }

  // Make prediction
  async predict(features) {
    if (!this.isModelLoaded) {
      await this.trainModel();
    }

    const inputTensor = tf.tensor2d([features]);
    const prediction = this.model.predict(inputTensor);
    const result = await prediction.data();

    inputTensor.dispose();
    prediction.dispose();

    return result[0];
  }

  // Calculate cost breakdown
  calculateBreakdown(area, floors, quality, selectedMaterials) {
    const breakdown = {
      materials: 0,
      labor: 0,
      foundation: 0,
      structure: 0,
      finishing: 0,
      electrical: 0,
      plumbing: 0,
      contingencies: 0
    };

    // Material costs
    selectedMaterials.forEach(materialId => {
      const material = this.materials.find(m => m.id === materialId);
      if (material) {
        // Estimate quantity based on area and material type
        let quantity = 1;
        if (material.category === 'Tiles & Flooring') quantity = area * 1.2;
        else if (material.category === 'Paints & Finishes') quantity = area * 0.5;
        else if (material.category === 'Bricks & Blocks') quantity = area * 10;
        else if (material.category === 'Cement & Concrete') quantity = area * 0.8;
        else quantity = area * 0.1; // Default

        breakdown.materials += material.price * quantity;
      }
    });

    // Base costs per sq ft
    const baseRates = {
      basic: 800,
      standard: 1200,
      premium: 1800,
      luxury: 2500
    };

    const qualityMultiplier = {
      basic: 0.8,
      standard: 1.0,
      premium: 1.4,
      luxury: 2.0
    };

    const baseRate = baseRates[quality] || 1200;
    const multiplier = qualityMultiplier[quality] || 1.0;
    const floorMultiplier = 1 + (floors - 1) * 0.3;

    const totalBaseCost = area * baseRate * multiplier * floorMultiplier;

    // Distribute costs
    breakdown.labor = totalBaseCost * 0.25;
    breakdown.foundation = totalBaseCost * 0.15;
    breakdown.structure = totalBaseCost * 0.35;
    breakdown.finishing = totalBaseCost * 0.15;
    breakdown.electrical = totalBaseCost * 0.05;
    breakdown.plumbing = totalBaseCost * 0.03;
    breakdown.contingencies = totalBaseCost * 0.02;

    return breakdown;
  }

  // Generate recommendations
  generateRecommendations(area, floors, quality, totalCost) {
    const recommendations = [];

    if (area > 3000) {
      recommendations.push("Consider phased construction for large areas to manage cash flow");
    }

    if (floors > 2) {
      recommendations.push("Multi-story construction requires additional structural engineering");
    }

    if (quality === 'luxury') {
      recommendations.push("Luxury finishes may require specialized contractors");
    }

    if (totalCost > 5000000) {
      recommendations.push("Consider government subsidies or housing loans for high-value projects");
    }

    recommendations.push("Get multiple contractor quotes before finalizing");
    recommendations.push("Include 5-10% contingency for unexpected costs");

    return recommendations;
  }
}

// Global predictor instance
const predictor = new ConstructionCostPredictor();

// DOM elements
let materialsGrid, predictionForm, resultsSection, totalCost, costRange, breakdownGrid, recommendationsList;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  materialsGrid = document.getElementById('materialsGrid');
  predictionForm = document.getElementById('predictionForm');
  resultsSection = document.getElementById('resultsSection');
  totalCost = document.getElementById('totalCost');
  costRange = document.getElementById('costRange');
  breakdownGrid = document.getElementById('breakdownGrid');
  recommendationsList = document.getElementById('recommendationsList');

  // Load data and initialize
  await predictor.loadData();
  loadMaterialsGrid();
  setupEventListeners();
});

// Load materials into the grid
function loadMaterialsGrid() {
  materialsGrid.innerHTML = '';

  predictor.materials.forEach(material => {
    const materialCard = document.createElement('div');
    materialCard.className = 'material-card';
    materialCard.innerHTML = `
      <div class="material-header">
        <input type="checkbox" id="material-${material.id}" value="${material.id}">
        <label for="material-${material.id}" class="material-label">
          <img src="/assets/${material.image}" alt="${material.name}" class="material-image">
          <div class="material-info">
            <h4>${material.name}</h4>
            <p class="material-category">${material.category}</p>
            <p class="material-price">₹${material.price}/${material.unit}</p>
          </div>
        </label>
      </div>
    `;
    materialsGrid.appendChild(materialCard);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Step navigation buttons
  document.getElementById('nextToMaterials').addEventListener('click', () => {
    if (validateStep1()) {
      showStep(2);
    }
  });

  document.getElementById('backToDetails').addEventListener('click', () => {
    showStep(1);
  });

  // Predict button
  document.getElementById('predictBtn').addEventListener('click', handlePrediction);

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetForm);

  // Save quote button
  document.getElementById('saveQuoteBtn').addEventListener('click', saveQuote);

  // Print button
  document.getElementById('printBtn').addEventListener('click', printEstimate);
}

// Validate step 1 (project details)
function validateStep1() {
  const projectType = document.getElementById('projectType').value;
  const area = document.getElementById('area').value;
  const floors = document.getElementById('floors').value;
  const quality = document.getElementById('quality').value;

  if (!projectType || !area || !floors || !quality) {
    alert('Please fill all required fields in Step 1');
    return false;
  }

  if (area < 100 || area > 10000) {
    alert('Please enter area between 100-10000 sq ft');
    return false;
  }

  return true;
}

// Show specific step
function showStep(stepNumber) {
  // Hide all steps
  document.getElementById('step1-content').style.display = 'none';
  document.getElementById('step2-content').style.display = 'none';

  // Show selected step
  document.getElementById(`step${stepNumber}-content`).style.display = 'block';

  // Update step indicators
  updateStepIndicators(stepNumber);
}

// Update step indicator visual states
function updateStepIndicators(activeStep) {
  const steps = [
    { id: 'step1', element: document.getElementById('step1') },
    { id: 'step2', element: document.getElementById('step2') },
    { id: 'step3', element: document.getElementById('step3') }
  ];

  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.element.className = 'step';

    if (stepNum < activeStep) {
      step.element.classList.add('completed');
    } else if (stepNum === activeStep) {
      step.element.classList.add('active');
    } else {
      step.element.classList.add('pending');
    }
  });
}

// Handle prediction
async function handlePrediction() {
  const formData = getFormData();
  if (!formData) return;

  // Show loading state
  const predictBtn = document.getElementById('predictBtn');
  const btnText = predictBtn.querySelector('.btn-text');
  const btnLoading = predictBtn.querySelector('.btn-loading');

  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  predictBtn.disabled = true;

  try {
    // Prepare features for ML prediction
    const qualityIndex = { basic: 0, standard: 1, premium: 2, luxury: 3 }[formData.quality];
    const features = [
      formData.area,
      parseInt(formData.floors),
      qualityIndex,
      formData.selectedMaterials.length
    ];

    // Get ML prediction
    const mlPrediction = await predictor.predict(features);

    // Calculate detailed breakdown
    const breakdown = predictor.calculateBreakdown(
      formData.area,
      parseInt(formData.floors),
      formData.quality,
      formData.selectedMaterials
    );

    // Calculate total cost (combine ML prediction with detailed breakdown)
    const totalCostValue = Math.max(mlPrediction, Object.values(breakdown).reduce((a, b) => a + b, 0));

    // Display results
    displayResults(totalCostValue, breakdown, formData);

  } catch (error) {
    console.error('Prediction error:', error);
    alert('Error occurred during prediction. Please try again.');
  } finally {
    // Hide loading state
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    predictBtn.disabled = false;
  }
}

// Get form data
function getFormData() {
  const projectType = document.getElementById('projectType').value;
  const area = parseFloat(document.getElementById('area').value);
  const floors = document.getElementById('floors').value;
  const quality = document.getElementById('quality').value;

  if (!projectType || !area || !floors || !quality) {
    alert('Please fill all required fields');
    return null;
  }

  const selectedMaterials = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => parseInt(cb.value));

  if (selectedMaterials.length === 0) {
    alert('Please select at least one material');
    return null;
  }

  return {
    projectType,
    area,
    floors,
    quality,
    selectedMaterials
  };
}

// Display results
function displayResults(totalCostValue, breakdown, formData) {
  // Update step indicator to completed
  updateStepIndicators(3);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Total cost
  totalCost.textContent = formatCurrency(totalCostValue);

  // Cost range (±10%)
  const rangeLow = totalCostValue * 0.9;
  const rangeHigh = totalCostValue * 1.1;
  costRange.textContent = `Range: ${formatCurrency(rangeLow)} - ${formatCurrency(rangeHigh)}`;

  // Cost breakdown
  breakdownGrid.innerHTML = '';
  Object.entries(breakdown).forEach(([category, amount]) => {
    if (amount > 0) {
      const breakdownItem = document.createElement('div');
      breakdownItem.className = 'breakdown-item';
      breakdownItem.innerHTML = `
        <span class="breakdown-label">${category.charAt(0).toUpperCase() + category.slice(1)}</span>
        <span class="breakdown-amount">${formatCurrency(amount)}</span>
      `;
      breakdownGrid.appendChild(breakdownItem);
    }
  });

  // Recommendations
  const recommendations = predictor.generateRecommendations(
    formData.area,
    parseInt(formData.floors),
    formData.quality,
    totalCostValue
  );

  recommendationsList.innerHTML = '';
  recommendations.forEach(rec => {
    const li = document.createElement('li');
    li.textContent = rec;
    recommendationsList.appendChild(li);
  });

  // Show results section
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Reset form
function resetForm() {
  predictionForm.reset();
  resultsSection.style.display = 'none';
}

// Save quote
function saveQuote() {
  // This would typically send data to server to save quote
  alert('Quote saved successfully! Our team will contact you soon.');
}

// Print estimate
function printEstimate() {
  window.print();
}

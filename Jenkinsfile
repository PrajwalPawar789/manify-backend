pipeline {
  agent any
  tools { 
    nodejs 'NodeJS' // Matches the Node.js tool name configured in Jenkins
  }

  stages {
    // Stage 1: Checkout code from Git
    stage('Checkout') {
      steps {
        checkout scm // Pulls code from your Git repo
      }
    }

    // Stage 2: Install dependencies
    stage('Install') {
      steps {
        bat 'npm ci' // Use 'npm ci' for clean installs (faster than 'npm install')
      }
    }

    // Stage 3: Build the app (if needed)
    stage('Build') {
      steps {
        bat 'npm run build' // Runs your build script (e.g., React/Vue)
      }
    }

    // Stage 4: Run tests
    stage('Test') {
      steps {
        bat 'npm test' // Execute your test suite
      }
    }

    // Stage 5: Deploy the app
    stage('Deploy') {
      steps {
        bat 'pm2 restart ecosystem.config.js' // Example deployment command for PM2
      }
    }
  }

  post {
    success {
      echo 'Pipeline succeeded! ✅'
    }
    failure {
      echo 'Pipeline failed! ❌'
    }
  }
}

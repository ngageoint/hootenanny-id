pipeline {
    agent any
    parameters {
        
        booleanParam(name: 'npm', defaultValue: true)
        booleanParam(name: 'cucumber', defaultValue: true)
        string(name: 'Box', defaultValue: 'default', description: 'Vagrant Box')
    }
    stages {
        stage("Setup") {
            steps {
                // Attempt to destroy exiting VM but don't stop job if not there
                sh "vagrant destroy -f ${params.Box} || true"
                cleanWs()

                // Configure environment
                sh 'export WORDS_HOME=/fouo/ubuntu'
            }
        }
        stage('Clone Repos') {
            steps {
                // Checkout hootenanny
                git url: 'https://github.com/ngageoint/hootenanny', branch: 'develop'
                sh "git submodule init; git submodule update; cd hoot-ui; git checkout ${env.GIT_COMMIT}"
                // Remove any screenshots from previous builds
                sh "rm -rf ./test-files/ui/screenshot_*.png"
            }
        }
        stage("Vagrant Up") {
            steps {
                sh '''
                    cp LocalConfig.pri.orig LocalConfig.pri
                    echo "QMAKE_CXXFLAGS += -Werror" >> LocalConfig.pri
                    sed -i s/"QMAKE_CXX=g++"/"#QMAKE_CXX=g++"/g LocalConfig.pri
                    sed -i s/"#QMAKE_CXX=ccache g++"/"QMAKE_CXX=ccache g++"/g LocalConfig.pri
                '''

                sh "vagrant up ${params.Box} --provider aws"
            }       
        }
        stage("npm test") {
            when { 
                expression { return params.npm }
            }
            steps {
                sh "vagrant ssh ${params.Box} -c 'cd hoot/hoot-ui; npm cache clear; rm -rf node_modules; npm dedupe; make && npm test'"
            }
        }
        stage("Cucumber") {
            when {
                expression { return params.cucumber }
            }
            steps {
                sh "vagrant ssh ${params.Box} -c 'cd hoot; source ./SetupEnv.sh; scripts/jenkins/TestPullRequest_ui.sh'"
            }
        }
    }
    post {
        always {
            // Send build notification
            notifySlack(currentBuild.result, "#builds_hoot-ui")
        }
        success {
            // If all tests passed, clean everything up
            sh "vagrant destroy -f ${params.Box}"
            cleanWs()
        }
        failure {
            // Copy over any UI failure screenshots and send to slack
            sh "vagrant scp ${params.Box}:~/hoot/test-files/ui/screenshot_*.png ./test-files/ui/"
            postSlack("${env.WORKSPACE}/test-files/ui/", "screenshot_*.png", "${env.JENKINS_BOT_TOKEN}", "#builds_hoot-ui")
        }
    }
}

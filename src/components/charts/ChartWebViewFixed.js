// src/components/charts/ChartWebViewFixed.js - Fixed with debugging
import React, {useRef} from 'react';
import {View, StyleSheet, Dimensions, Platform} from 'react-native';
import WebView from 'react-native-webview';

const {width: screenWidth} = Dimensions.get('window');

const ChartWebViewFixed = ({
  type = 'doughnut', // 'doughnut', 'bar', 'line', 'area'
  data,
  options = {},
  height = 300,
  backgroundColor = 'transparent',
  onChartPress = null,
}) => {
  const webViewRef = useRef(null);

  // Generate Chart.js HTML with error handling and debugging
  const generateChartHTML = () => {
    // Default chart options with debugging
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type !== 'doughnut',
          position: 'bottom',
          labels: {
            color: '#FFFFFF',
            font: {
              size: 12,
              weight: '500',
            },
            padding: 16,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
        },
      },
      scales:
        type === 'bar' || type === 'line'
          ? {
              x: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.7)',
                  font: {
                    size: 11,
                    weight: '500',
                  },
                },
              },
              y: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.7)',
                  font: {
                    size: 11,
                    weight: '500',
                  },
                },
              },
            }
          : {},
      ...options,
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 16px;
              background-color: ${backgroundColor};
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              overflow: hidden;
            }
            .chart-container {
              position: relative;
              width: 100%;
              height: ${height - 32}px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            canvas {
              max-width: 100%;
              height: 100% !important;
            }
            .debug-info {
              position: absolute;
              top: 5px;
              right: 5px;
              background: rgba(0,0,0,0.7);
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              z-index: 1000;
            }
          </style>
        </head>
        <body>
          <div id="debug" class="debug-info">Loading...</div>
          <div class="chart-container">
            <canvas id="chart"></canvas>
          </div>
          
          <!-- Chart.js CDN with fallback -->
          <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/dist/chart.umd.js"></script>
          
          <script>
            // Debug function
            function debugLog(message) {
              console.log('[ChartWebView]', message);
              const debugEl = document.getElementById('debug');
              if (debugEl) {
                debugEl.textContent = message;
              }
              
              // Send debug info back to React Native
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'debug',
                  message: message
                }));
              }
            }
            
            // Error handler
            window.onerror = function(message, source, lineno, colno, error) {
              const errorMsg = \`Error: \${message} at \${lineno}:\${colno}\`;
              debugLog(errorMsg);
              console.error('WebView Error:', errorMsg);
              
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: errorMsg,
                  stack: error ? error.stack : 'No stack trace'
                }));
              }
              return true;
            };
            
            // Wait for DOM to be ready
            document.addEventListener('DOMContentLoaded', function() {
              debugLog('DOM loaded');
              initChart();
            });
            
            // Fallback if DOM already loaded
            if (document.readyState === 'loading') {
              // Document hasn't finished loading yet
            } else {
              // Document has finished loading
              debugLog('DOM already loaded');
              initChart();
            }
            
            function initChart() {
              try {
                debugLog('Initializing chart...');
                
                // Check if Chart.js is loaded
                if (typeof Chart === 'undefined') {
                  throw new Error('Chart.js not loaded');
                }
                
                debugLog('Chart.js loaded successfully');
                
                const ctx = document.getElementById('chart');
                if (!ctx) {
                  throw new Error('Canvas element not found');
                }
                
                debugLog('Canvas element found');
                
                const chartData = ${JSON.stringify(data)};
                const chartOptions = ${JSON.stringify(chartOptions)};
                
                debugLog(\`Chart type: ${type}, Data points: \${chartData.datasets ? chartData.datasets[0]?.data?.length || 0 : 0}\`);
                
                // Enhanced gradients for different chart types
                if ('${type}' === 'doughnut') {
                  debugLog('Setting up doughnut chart gradients');
                  
                  // Beautiful gradients for pie/doughnut charts
                  const gradientColors = [
                    ['#667EEA', '#764BA2'],
                    ['#F093FB', '#F5576C'],
                    ['#4ECDC4', '#44A08D'],
                    ['#FFB74D', '#FF9800'],
                    ['#9C27B0', '#673AB7'],
                    ['#FF5722', '#E91E63'],
                    ['#00BCD4', '#009688'],
                    ['#8BC34A', '#4CAF50'],
                  ];
                  
                  if (chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data) {
                    chartData.datasets[0].backgroundColor = chartData.datasets[0].data.map((_, index) => {
                      const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
                      const colors = gradientColors[index % gradientColors.length];
                      gradient.addColorStop(0, colors[0]);
                      gradient.addColorStop(1, colors[1]);
                      return gradient;
                    });
                    
                    chartData.datasets[0].borderWidth = 0;
                    chartData.datasets[0].hoverBorderWidth = 2;
                    chartData.datasets[0].hoverBorderColor = '#FFFFFF';
                  }
                }
                
                if ('${type}' === 'bar') {
                  debugLog('Setting up bar chart gradients');
                  
                  // Gradient bars
                  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
                  gradient.addColorStop(0, '#4FC3F7');
                  gradient.addColorStop(1, '#29B6F6');
                  
                  if (chartData.datasets && chartData.datasets[0]) {
                    chartData.datasets[0].backgroundColor = gradient;
                    chartData.datasets[0].borderRadius = 6;
                    chartData.datasets[0].borderSkipped = false;
                  }
                }
                
                if ('${type}' === 'line') {
                  debugLog('Setting up line chart gradients');
                  
                  // Gradient line with area fill
                  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
                  gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
                  gradient.addColorStop(1, 'rgba(118, 75, 162, 0.1)');
                  
                  if (chartData.datasets && chartData.datasets[0]) {
                    chartData.datasets[0].backgroundColor = gradient;
                    chartData.datasets[0].borderColor = '#667EEA';
                    chartData.datasets[0].borderWidth = 3;
                    chartData.datasets[0].fill = true;
                    chartData.datasets[0].tension = 0.4;
                    chartData.datasets[0].pointBackgroundColor = '#FFFFFF';
                    chartData.datasets[0].pointBorderColor = '#667EEA';
                    chartData.datasets[0].pointBorderWidth = 2;
                    chartData.datasets[0].pointRadius = 4;
                    chartData.datasets[0].pointHoverRadius = 6;
                  }
                }
                
                debugLog('Creating Chart instance...');
                
                const chart = new Chart(ctx, {
                  type: '${type}',
                  data: chartData,
                  options: {
                    ...chartOptions,
                    onClick: (event, activeElements) => {
                      if (activeElements.length > 0 && window.ReactNativeWebView) {
                        const element = activeElements[0];
                        const data = {
                          datasetIndex: element.datasetIndex,
                          index: element.index,
                          value: chartData.datasets[element.datasetIndex].data[element.index],
                          label: chartData.labels ? chartData.labels[element.index] : \`Item \${element.index}\`,
                        };
                        
                        debugLog(\`Chart clicked: \${data.label}\`);
                        
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'chartPress',
                          data: data
                        }));
                      }
                    },
                    animation: {
                      onComplete: () => {
                        debugLog('Chart animation completed');
                        if (window.ReactNativeWebView) {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'animationComplete'
                          }));
                        }
                      }
                    }
                  }
                });
                
                debugLog('Chart created successfully!');
                
                // Hide debug info after successful creation
                setTimeout(() => {
                  const debugEl = document.getElementById('debug');
                  if (debugEl) {
                    debugEl.style.opacity = '0.3';
                  }
                }, 2000);
                
              } catch (error) {
                const errorMsg = \`Chart creation failed: \${error.message}\`;
                debugLog(errorMsg);
                console.error('Chart Error:', error);
                
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: errorMsg,
                    stack: error.stack
                  }));
                }
              }
            }
          </script>
        </body>
      </html>
    `;
  };

  const handleWebViewMessage = event => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'debug') {
        console.log('[ChartWebView Debug]', message.message);
      }

      if (message.type === 'error') {
        console.error('[ChartWebView Error]', message.message);
        if (message.stack) {
          console.error('[ChartWebView Stack]', message.stack);
        }
      }

      if (message.type === 'chartPress' && onChartPress) {
        console.log('[ChartWebView] Chart pressed:', message.data);
        onChartPress(message.data);
      }

      if (message.type === 'animationComplete') {
        console.log('[ChartWebView] Animation completed');
      }
    } catch (error) {
      console.error('[ChartWebView] Error parsing message:', error);
    }
  };

  const webViewProps =
    Platform.OS === 'android'
      ? {
          // Android specific props for debugging
          nativeConfig: {
            props: {
              webContentsDebuggingEnabled: true,
              allowFileAccessFromFileURLs: true,
              allowUniversalAccessFromFileURLs: true,
            },
          },
        }
      : {};

  return (
    <View style={[styles.container, {height}]}>
      <WebView
        ref={webViewRef}
        source={{html: generateChartHTML()}}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        onError={syntheticEvent => {
          const {nativeEvent} = syntheticEvent;
          console.error('[ChartWebView] WebView Error:', nativeEvent);
        }}
        onHttpError={syntheticEvent => {
          const {nativeEvent} = syntheticEvent;
          console.error('[ChartWebView] HTTP Error:', nativeEvent);
        }}
        onLoadStart={() => {
          console.log('[ChartWebView] Load started');
        }}
        onLoadEnd={() => {
          console.log('[ChartWebView] Load ended');
        }}
        {...webViewProps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default ChartWebViewFixed;

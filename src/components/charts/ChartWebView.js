// src/components/charts/ChartWebView.js - Chart.js in WebView
import React, {useRef} from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import WebView from 'react-native-webview';

const {width: screenWidth} = Dimensions.get('window');

const ChartWebView = ({
  type = 'doughnut', // 'doughnut', 'bar', 'line', 'area'
  data,
  options = {},
  height = 300,
  backgroundColor = 'transparent',
  onChartPress = null,
}) => {
  const webViewRef = useRef(null);

  // Generate Chart.js HTML
  const generateChartHTML = () => {
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
          <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
          <style>
            body {
              margin: 0;
              padding: 16px;
              background-color: ${backgroundColor};
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .chart-container {
              position: relative;
              width: 100%;
              height: ${height - 32}px;
            }
            canvas {
              max-width: 100%;
              height: 100% !important;
            }
          </style>
        </head>
        <body>
          <div class="chart-container">
            <canvas id="chart"></canvas>
          </div>
          
          <script>
            const ctx = document.getElementById('chart').getContext('2d');
            
            const chartData = ${JSON.stringify(data)};
            const chartOptions = ${JSON.stringify(chartOptions)};
            
            // Enhanced gradients for different chart types
            if ('${type}' === 'doughnut') {
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
              
              chartData.datasets[0].backgroundColor = chartData.datasets[0].data.map((_, index) => {
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                const colors = gradientColors[index % gradientColors.length];
                gradient.addColorStop(0, colors[0]);
                gradient.addColorStop(1, colors[1]);
                return gradient;
              });
              
              chartData.datasets[0].borderWidth = 0;
              chartData.datasets[0].hoverBorderWidth = 2;
              chartData.datasets[0].hoverBorderColor = '#FFFFFF';
            }
            
            if ('${type}' === 'bar') {
              // Gradient bars
              const gradient = ctx.createLinearGradient(0, 0, 0, 300);
              gradient.addColorStop(0, '#4FC3F7');
              gradient.addColorStop(1, '#29B6F6');
              
              chartData.datasets[0].backgroundColor = gradient;
              chartData.datasets[0].borderRadius = 6;
              chartData.datasets[0].borderSkipped = false;
            }
            
            if ('${type}' === 'line') {
              // Gradient line with area fill
              const gradient = ctx.createLinearGradient(0, 0, 0, 300);
              gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
              gradient.addColorStop(1, 'rgba(118, 75, 162, 0.1)');
              
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
                      label: chartData.labels[element.index],
                    };
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'chartPress',
                      data: data
                    }));
                  }
                }
              }
            });
            
            // Animation complete callback
            chart.options.onComplete = () => {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'animationComplete'
                }));
              }
            };
          </script>
        </body>
      </html>
    `;
  };

  const handleWebViewMessage = event => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'chartPress' && onChartPress) {
        onChartPress(message.data);
      }

      if (message.type === 'animationComplete') {
        console.log('Chart animation completed');
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

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

export default ChartWebView;

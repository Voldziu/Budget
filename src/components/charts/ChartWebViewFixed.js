// src/components/charts/ChartWebViewFixed.js - Naprawiona wersja
import React, {useRef} from 'react';
import {View, StyleSheet, Dimensions, Platform} from 'react-native';
import WebView from 'react-native-webview';

const {width: screenWidth} = Dimensions.get('window');

const ChartWebViewFixed = ({
  type = 'doughnut',
  data,
  options = {},
  height = 300,
  backgroundColor = 'transparent',
  onChartPress = null,
}) => {
  const webViewRef = useRef(null);

  const generateChartHTML = () => {
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type !== 'doughnut',
          position: 'bottom',
        },
      },
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
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              overflow: hidden;
            }
            .chart-container {
              position: relative;
              width: 100%;
              height: ${height - 32}px;
            }
            canvas {
              width: 100% !important;
              height: 100% !important;
            }
            .debug {
              position: fixed;
              top: 5px;
              left: 5px;
              background: rgba(255,0,0,0.8);
              color: white;
              padding: 4px;
              font-size: 10px;
              z-index: 9999;
            }
          </style>
        </head>
        <body>
          <div id="debug" class="debug">Ładowanie...</div>
          <div class="chart-container">
            <canvas id="chartCanvas"></canvas>
          </div>
          
          <!-- Chart.js - próba kilku wersji -->
          <script>
            let chartLoaded = false;
            let loadAttempt = 0;
            
            function log(msg) {
              console.log('[Chart]', msg);
              document.getElementById('debug').textContent = msg;
              
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'log',
                  message: msg
                }));
              }
            }
            
            function loadScript(src, callback) {
              const script = document.createElement('script');
              script.onload = callback;
              script.onerror = () => {
                log('Błąd ładowania: ' + src);
                tryNextScript();
              };
              script.src = src;
              document.head.appendChild(script);
            }
            
            const chartUrls = [
              'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
              'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js',
              'https://unpkg.com/chart.js@3.9.1/dist/chart.min.js'
            ];
            
            function tryNextScript() {
              if (loadAttempt < chartUrls.length && !chartLoaded) {
                log('Próba ' + (loadAttempt + 1) + ': ' + chartUrls[loadAttempt]);
                loadScript(chartUrls[loadAttempt], () => {
                  if (typeof Chart !== 'undefined') {
                    chartLoaded = true;
                    log('Chart.js załadowane!');
                    createChart();
                  } else {
                    log('Chart undefined po załadowaniu');
                    loadAttempt++;
                    tryNextScript();
                  }
                });
                loadAttempt++;
              } else if (!chartLoaded) {
                log('Nie udało się załadować Chart.js');
                // Pokaż prostą alternatywę
                showSimpleChart();
              }
            }
            
            function showSimpleChart() {
              const canvas = document.getElementById('chartCanvas');
              const ctx = canvas.getContext('2d');
              
              // Prosty wykres kołowy bez Chart.js
              if ('${type}' === 'doughnut') {
                drawSimplePie(ctx, ${JSON.stringify(data)});
              } else {
                ctx.fillStyle = '#666';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Wykres niedostępny', canvas.width/2, canvas.height/2);
              }
            }
            
            function drawSimplePie(ctx, data) {
              const canvas = ctx.canvas;
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const radius = Math.min(centerX, centerY) - 20;
              
              if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
                ctx.fillStyle = '#ccc';
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx.fill();
                return;
              }
              
              const values = data.datasets[0].data;
              const colors = data.datasets[0].backgroundColor || ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
              const total = values.reduce((sum, val) => sum + val, 0);
              
              let currentAngle = -Math.PI / 2;
              
              values.forEach((value, index) => {
                const sliceAngle = (value / total) * 2 * Math.PI;
                
                ctx.fillStyle = colors[index] || colors[index % colors.length];
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.closePath();
                ctx.fill();
                
                currentAngle += sliceAngle;
              });
            }
            
            function createChart() {
              try {
                const ctx = document.getElementById('chartCanvas');
                const chartData = ${JSON.stringify(data)};
                const chartOptions = ${JSON.stringify(chartOptions)};
                
                log('Tworzenie wykresu: ' + '${type}');
                
                const chart = new Chart(ctx, {
                  type: '${type}',
                  data: chartData,
                  options: {
                    ...chartOptions,
                    onClick: (event, elements) => {
                      if (elements.length > 0 && window.ReactNativeWebView) {
                        const element = elements[0];
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'chartPress',
                          data: {
                            index: element.index,
                            value: chartData.datasets[element.datasetIndex].data[element.index]
                          }
                        }));
                      }
                    }
                  }
                });
                
                log('Wykres utworzony!');
                
                // Ukryj debug po 3 sekundach
                setTimeout(() => {
                  document.getElementById('debug').style.display = 'none';
                }, 3000);
                
              } catch (error) {
                log('Błąd tworzenia wykresu: ' + error.message);
                showSimpleChart();
              }
            }
            
            // Rozpocznij ładowanie
            log('Rozpoczynam ładowanie...');
            tryNextScript();
            
            // Fallback timeout
            setTimeout(() => {
              if (!chartLoaded) {
                log('Timeout - używam prostego wykresu');
                showSimpleChart();
              }
            }, 10000);
          </script>
        </body>
      </html>
    `;
  };

  const handleWebViewMessage = event => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'log') {
        console.log('[ChartWebView]', message.message);
      }

      if (message.type === 'chartPress' && onChartPress) {
        onChartPress(message.data);
      }
    } catch (error) {
      console.error('[ChartWebView] Message error:', error);
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
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        mixedContentMode="compatibility"
        onError={error => {
          console.error('[ChartWebView] WebView Error:', error.nativeEvent);
        }}
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

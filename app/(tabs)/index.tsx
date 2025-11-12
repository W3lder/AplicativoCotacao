import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import axios, { isAxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// API principal - ExchangeRate-API (gratuita, sem chave necessária)
const API_BASE = 'https://api.exchangerate-api.com/v4/latest';

interface ApiError {
  code?: number;
  type?: string;
  info?: string;
}

interface ExchangeRateResponse {
  rates?: Record<string, number>;
  conversion_rate?: number;
  result?: number;
  success?: boolean;
  error?: string | ApiError;
}

export default function HomeScreen() {
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('BRL');
  const [amount, setAmount] = useState<string>('1');
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCurrencies, setLoadingCurrencies] = useState<boolean>(true);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  const logError = (context: string, error: unknown, details?: Record<string, unknown>) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      context,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      ...details,
    };
    console.error('[CurrencyConverter]', JSON.stringify(errorDetails, null, 2));
  };

  const fetchCurrencies = useCallback(async () => {
    setLoadingCurrencies(true);
    setError(null);
    const apiUrl = `${API_BASE}/USD`;
    
    try {
      const res = await axios.get<ExchangeRateResponse>(apiUrl, {
        timeout: 10000,
      });

      if (res.data?.success === false) {
        const apiError = res.data.error;
        let errorMsg = 'Erro na API';
        if (typeof apiError === 'object' && apiError !== null) {
          errorMsg = apiError.info || apiError.type || errorMsg;
        } else if (typeof apiError === 'string') {
          errorMsg = apiError;
        }
        throw new Error(errorMsg);
      }

      if (res.data && res.data.rates) {
        const currencyList = Object.keys(res.data.rates).sort();
        setCurrencies(currencyList);
        
        if (currencyList.length === 0) {
          const errorMsg = 'Nenhuma moeda encontrada na resposta da API';
          setError(errorMsg);
          logError('fetchCurrencies', new Error(errorMsg), { apiUrl, response: res.data });
        }
      } else {
        const errorMsg = `Resposta da API inválida: estrutura de dados inesperada`;
        logError('fetchCurrencies', new Error(errorMsg), {
          apiUrl,
          responseStructure: res.data ? Object.keys(res.data) : 'null',
          fullResponse: res.data,
        });
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorDetails = {
        apiUrl: `${API_BASE}/USD`,
        isAxiosError: isAxiosError(error),
        status: isAxiosError(error) ? error.response?.status : undefined,
        message: isAxiosError(error) ? error.message : String(error),
      };

      logError('fetchCurrencies', error, errorDetails);

      let errorMessage = 'Erro ao carregar moedas. ';
      
      if (isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          errorMessage += 'Tempo de conexão esgotado. Verifique sua internet.';
        } else if (error.response) {
          if (error.response.status === 429) {
            errorMessage += 'Muitas requisições. Aguarde um momento e tente novamente.';
          } else {
            errorMessage += `Erro do servidor (${error.response.status}). Tente novamente mais tarde.`;
          }
        } else if (error.request) {
          errorMessage += 'Sem resposta do servidor. Verifique sua conexão.';
        } else {
          errorMessage += 'Erro na requisição. Tente novamente.';
        }
      } else if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Erro desconhecido. Verifique sua conexão.';
      }

      setError(errorMessage);
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const convert = async () => {
    if (!amount || amount.trim() === '') {
      Alert.alert('Atenção', 'Por favor, insira um valor para converter.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Atenção', 'Por favor, insira um valor numérico válido maior que zero.');
      return;
    }

    if (fromCurrency === toCurrency) {
      setResult(numAmount);
      setError(null);
      setExchangeRate(1);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setExchangeRate(null);

    const apiUrl = `${API_BASE}/${fromCurrency}`;

    try {
      const res = await axios.get<ExchangeRateResponse>(apiUrl, {
        timeout: 10000,
      });

      if (res.data?.success === false) {
        const apiError = res.data.error;
        let errorMsg = 'Erro na API';
        if (typeof apiError === 'object' && apiError !== null) {
          errorMsg = apiError.info || apiError.type || errorMsg;
        } else if (typeof apiError === 'string') {
          errorMsg = apiError;
        }
        throw new Error(errorMsg);
      }

      if (res.data?.rates && res.data.rates[toCurrency]) {
        const rate = res.data.rates[toCurrency];
        const conversionResult = numAmount * rate;
        setResult(conversionResult);
        setExchangeRate(rate);
      } else {
        throw new Error(`Taxa de câmbio não encontrada para ${toCurrency}. Verifique se a moeda está disponível.`);
      }
    } catch (error) {
      const errorDetails = {
        fromCurrency,
        toCurrency,
        amount: numAmount,
        apiUrl,
        isAxiosError: isAxiosError(error),
        status: isAxiosError(error) ? error.response?.status : undefined,
      };

      logError('convert', error, errorDetails);

      let errorMessage = 'Erro ao converter. ';

      if (isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          errorMessage += 'Tempo de conexão esgotado. Verifique sua internet.';
        } else if (error.response) {
          if (error.response.status === 404) {
            errorMessage += `Moeda "${fromCurrency}" não encontrada.`;
          } else if (error.response.status === 429) {
            errorMessage += 'Muitas requisições. Aguarde um momento e tente novamente.';
          } else {
            errorMessage += `Erro do servidor (${error.response.status}). Tente novamente.`;
          }
        } else if (error.request) {
          errorMessage += 'Sem resposta do servidor. Verifique sua conexão.';
        } else {
          errorMessage += 'Erro na requisição. Tente novamente.';
        }
      } else if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Erro desconhecido. Verifique sua conexão.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setResult(null);
    setExchangeRate(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Conversor de Moedas</Text>
            <Text style={styles.subtitle}>Taxas de câmbio em tempo real</Text>
          </View>

          {loadingCurrencies ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Carregando moedas...</Text>
            </View>
          ) : (
            <>
              {/* Amount Input Card */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Valor</Text>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>{fromCurrency}</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={(text) => {
                      setAmount(text);
                      setError(null);
                      setResult(null);
                      setExchangeRate(null);
                    }}
                    selectTextOnFocus
                  />
                </View>
              </View>

              {/* Currency Selection Cards */}
              <View style={styles.currencyRow}>
                <View style={[styles.card, styles.currencyCard]}>
                  <Text style={styles.cardLabel}>De</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={fromCurrency}
                      style={styles.picker}
                      dropdownIconColor="#64748b"
                      onValueChange={(itemValue: string) => {
                        setFromCurrency(itemValue);
                        setError(null);
                        setResult(null);
                        setExchangeRate(null);
                      }}
                      enabled={!loadingCurrencies}>
                      {currencies.map((cur) => (
                        <Picker.Item label={cur} value={cur} key={cur} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.swapButton}
                  onPress={swapCurrencies}
                  activeOpacity={0.7}>
                  <MaterialIcons name="swap-horiz" size={28} color="#2563eb" />
                </TouchableOpacity>

                <View style={[styles.card, styles.currencyCard]}>
                  <Text style={styles.cardLabel}>Para</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={toCurrency}
                      style={styles.picker}
                      dropdownIconColor="#64748b"
                      onValueChange={(itemValue: string) => {
                        setToCurrency(itemValue);
                        setError(null);
                        setResult(null);
                        setExchangeRate(null);
                      }}
                      enabled={!loadingCurrencies}>
                      {currencies.map((cur) => (
                        <Picker.Item label={cur} value={cur} key={cur} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Convert Button */}
              <TouchableOpacity
                style={[styles.convertButton, (loading || loadingCurrencies) && styles.convertButtonDisabled]}
                onPress={convert}
                disabled={loading || loadingCurrencies}
                activeOpacity={0.8}>
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="calculate" size={20} color="#ffffff" style={styles.buttonIcon} />
                    <Text style={styles.convertButtonText}>Converter</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Result Card */}
              {result !== null && (
                <View style={[styles.card, styles.resultCard]}>
                  <View style={styles.resultHeader}>
                    <MaterialIcons name="trending-up" size={24} color="#10b981" />
                    <Text style={styles.resultTitle}>Resultado</Text>
                  </View>
                  
                  <View style={styles.resultContent}>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Valor convertido</Text>
                      <Text style={styles.resultValue}>
                        {result.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: toCurrency,
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                    
                    {exchangeRate !== null && exchangeRate !== 1 && (
                      <View style={styles.rateInfo}>
                        <Text style={styles.rateText}>
                          1 {fromCurrency} = {exchangeRate.toLocaleString('pt-BR', {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })} {toCurrency}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Error Message */}
              {error && !loading && (
                <View style={[styles.card, styles.errorCard]}>
                  <View style={styles.errorHeader}>
                    <MaterialIcons name="error-outline" size={20} color="#ef4444" />
                    <Text style={styles.errorTitle}>Erro</Text>
                  </View>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                      if (loadingCurrencies) {
                        fetchCurrencies();
                      } else {
                        convert();
                      }
                    }}
                    activeOpacity={0.7}>
                    <MaterialIcons name="refresh" size={18} color="#2563eb" />
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 12,
    minWidth: 50,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    padding: 0,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  currencyCard: {
    flex: 1,
    padding: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  picker: {
    height: 50,
    color: '#0f172a',
  },
  swapButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  convertButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  convertButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  convertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  resultCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 8,
  },
  resultContent: {
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: -0.5,
  },
  rateInfo: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
  },
  rateText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
});

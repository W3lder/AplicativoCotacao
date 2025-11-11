import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function App() {
  const [currencies, setCurrencies] = useState([]);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("BRL");
  const [amount, setAmount] = useState("1");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const res = await axios.get("https://api.exchangerate.host/latest");
      setCurrencies(Object.keys(res.data.rates));
    } catch (error) {
      console.error(error);
    }
  };

  const convert = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `https://api.exchangerate.host/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`
      );
      setResult(res.data.result);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💱 Conversor de Moedas</Text>

      <TextInput
        style={styles.input}
        placeholder="Valor"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <View style={styles.pickers}>
        <Picker
          selectedValue={fromCurrency}
          style={styles.picker}
          onValueChange={(itemValue) => setFromCurrency(itemValue)}
        >
          {currencies.map((cur) => (
            <Picker.Item label={cur} value={cur} key={cur} />
          ))}
        </Picker>

        <Text style={{ fontSize: 18, marginHorizontal: 10 }}>→</Text>

        <Picker
          selectedValue={toCurrency}
          style={styles.picker}
          onValueChange={(itemValue) => setToCurrency(itemValue)}
        >
          {currencies.map((cur) => (
            <Picker.Item label={cur} value={cur} key={cur} />
          ))}
        </Picker>
      </View>

      <Button title="Converter" onPress={convert} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        result && (
          <Text style={styles.result}>
            {amount} {fromCurrency} = {result.toFixed(2)} {toCurrency}
          </Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f6fa",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    width: "80%",
    marginBottom: 15,
    textAlign: "center",
  },
  pickers: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  picker: {
    height: 50,
    width: 120,
  },
  result: {
    fontSize: 20,
    marginTop: 20,
    fontWeight: "bold",
  },
});

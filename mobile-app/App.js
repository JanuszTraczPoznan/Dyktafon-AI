import React, { useEffect, useState } from 'react';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';

import { Audio } from 'expo-av';

import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';

import AsyncStorage from '@react-native-async-storage/async-storage';

import NetInfo from '@react-native-community/netinfo';

import * as Sharing from 'expo-sharing';


const STORAGE_KEY = '@dyktafon_recordings';
const MEMORY_TEST_KEY = '@dyktafon_memory_test';

const KEEP_AWAKE_TAG = 'DYKTAFON_RECORDING';

const WEBHOOK_URL =
  'WKLEJ_TUTAJ_WLASNY_WEBHOOK_MAKE';

/*
 * Bezpieczny limit pliku wysyłanego do webhooka.
 * Pozostawiamy zapas na pozostałe elementy formularza.
 */
const MAX_WEBHOOK_FILE_BYTES =
  4.5 * 1024 * 1024;


export default function App() {
  const [screen, setScreen] =
    useState('dashboard');

  const [recording, setRecording] =
    useState(undefined);

  const [
    recordingsList,
    setRecordingsList,
  ] = useState([]);

  const [activeTab, setActiveTab] =
    useState('Treść');

  const [selectedRec, setSelectedRec] =
    useState(null);

  const [sound, setSound] =
    useState(undefined);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [clientName, setClientName] =
    useState('');

  const [
    playbackPosition,
    setPlaybackPosition,
  ] = useState(0);

  const [
    playbackDuration,
    setPlaybackDuration,
  ] = useState(0);

  const [
    isLoadingRecordings,
    setIsLoadingRecordings,
  ] = useState(true);

  const [
    memoryStatus,
    setMemoryStatus,
  ] = useState('SPRAWDZANIE');

  const [
    memoryTestValue,
    setMemoryTestValue,
  ] = useState('BRAK');

  const [
    savedRecordsCount,
    setSavedRecordsCount,
  ] = useState(0);

  const [
    isExporting,
    setIsExporting,
  ] = useState(false);


  /*
   * INFORMACJE O PLIKU AUDIO
   *
   * Nie korzystamy z expo-file-system.
   * Lokalny plik jest odczytywany jako Blob.
   */
  async function getAudioFileInfo(uri) {
    if (!uri) {
      return {
        exists: false,
        size: 0,
      };
    }

    try {
      const response =
        await fetch(uri);

      if (!response.ok) {
        return {
          exists: false,
          size: 0,
        };
      }

      const blob =
        await response.blob();

      return {
        exists: true,

        size:
          typeof blob.size === 'number'
            ? blob.size
            : 0,
      };

    } catch (error) {
      console.log(
        'Błąd odczytu informacji o pliku:',
        error
      );

      return {
        exists: false,
        size: 0,
      };
    }
  }


  /*
   * UZUPEŁNIANIE STARYCH REKORDÓW
   * O ROZMIAR PLIKU
   */
  async function enrichRecordingsWithFileInfo(
    list
  ) {
    const enriched = [];

    for (const item of list) {
      if (
        typeof item.fileSizeBytes ===
          'number' &&
        item.fileSizeBytes > 0
      ) {
        enriched.push(item);

        continue;
      }

      const info =
        await getAudioFileInfo(
          item.uri
        );

      enriched.push({
        ...item,

        fileSizeBytes:
          info.size,

        fileExists:
          info.exists,
      });
    }

    return enriched;
  }


  /*
   * WCZYTANIE DANYCH
   */
  useEffect(() => {
    async function loadData() {
      try {
        const savedData =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        const memoryTest =
          await AsyncStorage.getItem(
            MEMORY_TEST_KEY
          );

        setMemoryTestValue(
          memoryTest || 'BRAK'
        );

        if (!savedData) {
          setRecordingsList([]);

          setSavedRecordsCount(0);

          setMemoryStatus(
            memoryTest
              ? 'OK'
              : 'PUSTA'
          );

          return;
        }

        const parsedData =
          JSON.parse(savedData);

        if (
          Array.isArray(parsedData)
        ) {
          const enrichedData =
            await enrichRecordingsWithFileInfo(
              parsedData
            );

          setRecordingsList(
            enrichedData
          );

          setSavedRecordsCount(
            enrichedData.length
          );

          setMemoryStatus('OK');

          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
              enrichedData
            )
          );

        } else {
          setRecordingsList([]);

          setSavedRecordsCount(0);

          setMemoryStatus(
            'BŁĘDNE DANE'
          );
        }

      } catch (error) {
        console.log(
          'Błąd odczytu danych:',
          error
        );

        setMemoryStatus('BŁĄD');

        setMemoryTestValue(
          'BŁĄD'
        );

        Alert.alert(
          'Błąd pamięci',
          'Nie udało się odczytać zapisanych nagrań.'
        );

      } finally {
        setIsLoadingRecordings(
          false
        );
      }
    }

    loadData();
  }, []);


  /*
   * ZWOLNIENIE ODTWARZACZA
   */
  useEffect(() => {
    return () => {
      if (sound) {
        sound
          .unloadAsync()
          .catch(() => {});
      }
    };
  }, [sound]);


  /*
   * AWARYJNE WYŁĄCZENIE KEEP AWAKE
   */
  useEffect(() => {
    return () => {
      try {
        deactivateKeepAwake(
          KEEP_AWAKE_TAG
        );

      } catch (error) {
        console.log(
          'Błąd wyłączenia Keep Awake:',
          error
        );
      }
    };
  }, []);


  /*
   * ZAPIS LISTY
   */
  async function saveRecordingsList(
    list
  ) {
    try {
      const jsonData =
        JSON.stringify(list);

      await AsyncStorage.setItem(
        STORAGE_KEY,
        jsonData
      );

      await AsyncStorage.setItem(
        MEMORY_TEST_KEY,
        'ZAPISANO'
      );

      setMemoryStatus('OK');

      setMemoryTestValue(
        'ZAPISANO'
      );

      setSavedRecordsCount(
        list.length
      );

      return true;

    } catch (error) {
      console.log(
        'Błąd zapisu AsyncStorage:',
        error
      );

      setMemoryStatus('BŁĄD');

      setMemoryTestValue(
        'BŁĄD'
      );

      Alert.alert(
        'Błąd pamięci',
        'Nie udało się zapisać danych nagrania.'
      );

      return false;
    }
  }


  /*
   * AKTUALIZACJA JEDNEGO REKORDU
   */
  async function updateRecording(
    recordingId,
    changes
  ) {
    const updatedList =
      recordingsList.map(
        (item) =>
          item.id === recordingId
            ? {
                ...item,
                ...changes,
              }
            : item
      );

    setRecordingsList(
      updatedList
    );

    const updatedSelected =
      updatedList.find(
        (item) =>
          item.id === recordingId
      );

    if (updatedSelected) {
      setSelectedRec(
        updatedSelected
      );
    }

    await saveRecordingsList(
      updatedList
    );

    return updatedList;
  }


  /*
   * AKTUALIZACJA STATUSU
   */
  async function updateRecordingStatus(
    recordingId,
    newStatus
  ) {
    return updateRecording(
      recordingId,
      {
        status: newStatus,
      }
    );
  }


  /*
   * DIAGNOSTYKA PAMIĘCI
   */
  async function checkMemoryNow() {
    try {
      const savedData =
        await AsyncStorage.getItem(
          STORAGE_KEY
        );

      const memoryTest =
        await AsyncStorage.getItem(
          MEMORY_TEST_KEY
        );

      let count = 0;

      if (savedData) {
        const parsedData =
          JSON.parse(savedData);

        if (
          Array.isArray(parsedData)
        ) {
          count =
            parsedData.length;
        }
      }

      setSavedRecordsCount(count);

      setMemoryTestValue(
        memoryTest || 'BRAK'
      );

      setMemoryStatus(
        savedData || memoryTest
          ? 'OK'
          : 'PUSTA'
      );

      Alert.alert(
        'Wynik testu pamięci',
        `Pamięć: ${
          savedData || memoryTest
            ? 'OK'
            : 'PUSTA'
        }\n` +
          `Rekordy: ${count}\n` +
          `Test: ${
            memoryTest || 'BRAK'
          }`
      );

    } catch (error) {
      console.log(
        'Błąd testu pamięci:',
        error
      );

      Alert.alert(
        'Błąd',
        'Nie udało się sprawdzić pamięci.'
      );
    }
  }


  /*
   * START NAGRYWANIA
   */
  async function startRecording() {
    try {
      if (recording) {
        await recording
          .stopAndUnloadAsync()
          .catch(() => {});
      }

      const permission =
        await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Brak dostępu do mikrofonu',
          'Aplikacja potrzebuje dostępu do mikrofonu.'
        );

        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,

        playsInSilentModeIOS: true,

        staysActiveInBackground:
          true,

        shouldDuckAndroid: false,

        playThroughEarpieceAndroid:
          false,
      });

      const recordingOptions = {
        android: {
          extension: '.m4a',

          outputFormat:
            Audio.AndroidOutputFormat
              .MPEG_4,

          audioEncoder:
            Audio.AndroidAudioEncoder
              .AAC,

          sampleRate: 22050,

          numberOfChannels: 1,

          bitRate: 48000,
        },

        ios: {
          extension: '.m4a',

          audioQuality:
            Audio.IOSAudioQuality
              .MEDIUM,

          sampleRate: 44100,

          numberOfChannels: 1,

          bitRate: 64000,

          linearPCMBitDepth: 16,

          linearPCMIsBigEndian:
            false,

          linearPCMIsFloat:
            false,
        },

        web: {},
      };

      await activateKeepAwakeAsync(
        KEEP_AWAKE_TAG
      );

      const {
        recording: newRecording,
      } =
        await Audio.Recording.createAsync(
          recordingOptions
        );

      setRecording(
        newRecording
      );

      setScreen('ambient');

    } catch (error) {
      console.log(
        'Błąd startu nagrywania:',
        error
      );

      try {
        deactivateKeepAwake(
          KEEP_AWAKE_TAG
        );

      } catch (keepAwakeError) {
        console.log(
          'Błąd Keep Awake:',
          keepAwakeError
        );
      }

      Alert.alert(
        'Błąd nagrywania',
        'Nie udało się rozpocząć nagrywania.'
      );

      setScreen('dashboard');
    }
  }


  /*
   * POTWIERDZENIE PLIKU
   *
   * Nie kopiujemy pliku przez expo-file-system.
   * Zachowujemy jego oryginalny adres URI.
   */
  async function createPersistentRecordingCopy(
    sourceUri,
    recordingId
  ) {
    const originalInfo =
      await getAudioFileInfo(
        sourceUri
      );

    if (!originalInfo.exists) {
      throw new Error(
        'Nie udało się potwierdzić istnienia pliku audio.'
      );
    }

    return {
      uri:
        sourceUri,

      size:
        originalInfo.size,
    };
  }


  /*
   * STOP NAGRYWANIA
   */
  async function stopRecording() {
    if (!recording) {
      return;
    }

    try {
      const status =
        await recording
          .stopAndUnloadAsync();

      const originalUri =
        recording.getURI();

      if (!originalUri) {
        throw new Error(
          'Brak ścieżki pliku audio.'
        );
      }

      const durationMillis =
        status.durationMillis || 0;

      const durationStr =
        formatTime(
          durationMillis
        );

      const now =
        new Date();

      const recordingId =
        Date.now().toString();

      const timeStr =
        now.toLocaleTimeString(
          'pl-PL',
          {
            hour: '2-digit',

            minute: '2-digit',
          }
        );

      const persistentFile =
        await createPersistentRecordingCopy(
          originalUri,
          recordingId
        );

      const newRecording = {
        id:
          recordingId,

        date:
          now.toLocaleDateString(
            'pl-PL'
          ),

        time:
          timeStr,

        client:
          clientName.trim() ||
          'Nieznany klient',

        status:
          'Oczekuje na wysłanie',

        uri:
          persistentFile.uri,

        originalUri:
          originalUri,

        duration:
          durationStr,

        durationMillis:
          durationMillis,

        fileSizeBytes:
          persistentFile.size,

        fileExists:
          true,
      };

      const updatedList = [
        newRecording,
        ...recordingsList,
      ];

      const saveResult =
        await saveRecordingsList(
          updatedList
        );

      if (!saveResult) {
        throw new Error(
          'Brak potwierdzenia zapisu.'
        );
      }

      setRecordingsList(
        updatedList
      );

      setClientName('');

      Alert.alert(
        'Nagranie zapisane',
        `Czas: ${durationStr}\n` +
          `Rozmiar: ${
            formatFileSize(
              persistentFile.size
            )
          }\n` +
          'Status: Oczekuje na wysłanie'
      );

    } catch (error) {
      console.log(
        'Błąd zapisu nagrania:',
        error
      );

      Alert.alert(
        'Błąd zapisu',
        'Nie udało się zapisać danych nagrania.'
      );

    } finally {
      try {
        deactivateKeepAwake(
          KEEP_AWAKE_TAG
        );

      } catch (error) {
        console.log(
          'Błąd wyłączenia Keep Awake:',
          error
        );
      }

      setRecording(undefined);

      setScreen('dashboard');
    }
  }


  /*
   * STATUS ODTWARZANIA
   */
  const onPlaybackStatusUpdate = (
    status
  ) => {
    if (status.isLoaded) {
      setPlaybackPosition(
        status.positionMillis || 0
      );

      setPlaybackDuration(
        status.durationMillis || 0
      );

      if (status.didJustFinish) {
        setIsPlaying(false);

        setPlaybackPosition(0);
      }
    }
  };


  /*
   * ODTWARZANIE AUDIO
   */
  async function togglePlayback(uri) {
    if (!uri) {
      Alert.alert(
        'Brak audio',
        'Brak poprawnego pliku nagrania.'
      );

      return;
    }

    try {
      if (
        isPlaying &&
        sound
      ) {
        await sound.stopAsync();

        setIsPlaying(false);

        return;
      }

      if (sound) {
        await sound.unloadAsync();

        setSound(undefined);
      }

      const {
        sound: newSound,
      } =
        await Audio.Sound.createAsync(
          {
            uri: uri,
          },

          {
            shouldPlay: true,

            volume: 1.0,
          },

          onPlaybackStatusUpdate
        );

      setSound(newSound);

      setIsPlaying(true);

    } catch (error) {
      console.log(
        'Błąd odtwarzania:',
        error
      );

      Alert.alert(
        'Błąd odtwarzania',
        'Plik audio nie jest dostępny lub nie udało się go odtworzyć.'
      );
    }
  }


  /*
   * PRZEWIJANIE AUDIO
   */
  async function seekAudio(
    targetMillis
  ) {
    if (sound) {
      await sound.setPositionAsync(
        targetMillis
      );

      setPlaybackPosition(
        targetMillis
      );
    }
  }


  /*
   * FORMAT CZASU
   */
  function formatTime(millis) {
    if (
      !millis ||
      isNaN(millis)
    ) {
      return '0:00';
    }

    const totalSeconds =
      Math.floor(
        millis / 1000
      );

    const minutes =
      Math.floor(
        totalSeconds / 60
      );

    const seconds =
      totalSeconds % 60;

    return (
      `${minutes}:` +
      `${seconds < 10 ? '0' : ''}` +
      `${seconds}`
    );
  }


  /*
   * FORMAT ROZMIARU PLIKU
   */
  function formatFileSize(bytes) {
    if (
      typeof bytes !== 'number' ||
      bytes <= 0
    ) {
      return 'nieznany';
    }

    const kilobytes =
      bytes / 1024;

    if (kilobytes < 1024) {
      return (
        `${kilobytes.toFixed(1)} KB`
      );
    }

    const megabytes =
      kilobytes / 1024;

    return (
      `${megabytes.toFixed(2)} MB`
    );
  }


  /*
   * ODŚWIEŻANIE INFORMACJI O PLIKU
   */
  async function refreshSelectedFileInfo() {
    if (
      !selectedRec ||
      !selectedRec.uri
    ) {
      return;
    }

    const info =
      await getAudioFileInfo(
        selectedRec.uri
      );

    await updateRecording(
      selectedRec.id,
      {
        fileSizeBytes:
          info.size,

        fileExists:
          info.exists,
      }
    );

    Alert.alert(
      'Informacje o pliku',
      `Plik istnieje: ${
        info.exists
          ? 'TAK'
          : 'NIE'
      }\n` +
        `Rozmiar: ${
          formatFileSize(
            info.size
          )
        }`
    );
  }


  /*
   * EKSPORT AUDIO
   *
   * Otwiera systemowe menu udostępniania.
   * Oryginalny plik nie jest usuwany.
   */
  async function exportAudio(rec) {
    if (
      !rec ||
      !rec.uri
    ) {
      Alert.alert(
        'Brak pliku',
        'Brak poprawnego pliku audio.'
      );

      return;
    }

    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const info =
        await getAudioFileInfo(
          rec.uri
        );

      if (!info.exists) {
        throw new Error(
          'Plik nie istnieje w pamięci aplikacji.'
        );
      }

      await updateRecording(
        rec.id,
        {
          fileSizeBytes:
            info.size,

          fileExists:
            true,
        }
      );

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          'Udostępnianie niedostępne',
          'Na tym urządzeniu nie można otworzyć systemowego menu udostępniania.'
        );

        return;
      }

      await Sharing.shareAsync(
        rec.uri,
        {
          mimeType:
            'audio/mp4',

          dialogTitle:
            'Eksportuj nagranie audio',
        }
      );

    } catch (error) {
      console.log(
        'Błąd eksportu audio:',
        error
      );

      Alert.alert(
        'Błąd eksportu',
        'Nie udało się udostępnić pliku. Nagranie nadal pozostaje zapisane w aplikacji.'
      );

    } finally {
      setIsExporting(false);
    }
  }


  /*
   * TEKST PRZYCISKU WYSYŁANIA
   */
  function getSendButtonText(
    status
  ) {
    if (
      status === 'Wysyłanie...'
    ) {
      return '⏳ Wysyłanie...';
    }

    if (
      status === 'Wysłano'
    ) {
      return '✅ Wysłano';
    }

    if (
      status === 'Błąd wysyłania'
    ) {
      return '🔄 Ponów wysyłkę';
    }

    return '🚀 Wyślij do Transkrypcji';
  }


  /*
   * WYSYŁANIE DO MAKE
   */
  async function sendRecordingToWebhook(
    rec
  ) {
    if (
      !rec ||
      !rec.uri
    ) {
      Alert.alert(
        'Błąd',
        'Brak poprawnego pliku nagrania.'
      );

      return;
    }

    if (
      rec.status ===
        'Wysyłanie...' ||
      rec.status ===
        'Wysłano'
    ) {
      return;
    }

    try {
      const fileInfo =
        await getAudioFileInfo(
          rec.uri
        );

      if (!fileInfo.exists) {
        Alert.alert(
          'Brak pliku',
          'Nagranie nie jest dostępne w pamięci aplikacji.'
        );

        return;
      }

      await updateRecording(
        rec.id,
        {
          fileSizeBytes:
            fileInfo.size,

          fileExists:
            true,
        }
      );

      if (
        fileInfo.size >
        MAX_WEBHOOK_FILE_BYTES
      ) {
        await updateRecordingStatus(
          rec.id,
          'Błąd wysyłania'
        );

        Alert.alert(
          'Plik jest za duży',
          `Rozmiar nagrania: ${
            formatFileSize(
              fileInfo.size
            )
          }.\n\n` +
            'Tego pliku nie należy wysyłać bezpośrednio do webhooka Make.\n\n' +
            'Użyj przycisku „Eksportuj audio” i wybierz Dysk Google.\n\n' +
            'Nagranie pozostaje zapisane w telefonie.'
        );

        return;
      }

      const networkState =
        await NetInfo.fetch();

      console.log(
        'Stan sieci:',
        networkState
      );

      const noConnection =
        networkState
          .isConnected === false;

      const internetUnavailable =
        networkState
          .isInternetReachable ===
        false;

      if (
        noConnection ||
        internetUnavailable
      ) {
        await updateRecordingStatus(
          rec.id,
          'Oczekuje na wysłanie'
        );

        Alert.alert(
          'Brak Internetu',
          'Nagranie pozostaje zapisane w telefonie. Po odzyskaniu połączenia otwórz nagranie i ponów wysyłkę.'
        );

        return;
      }

      await updateRecordingStatus(
        rec.id,
        'Wysyłanie...'
      );

      const formData =
        new FormData();

      const filePayload = {
        uri:
          rec.uri,

        name:
          `recording_${rec.id}.m4a`,

        type:
          'audio/m4a',
      };

      /*
       * Plik jest dołączany tylko raz.
       */
      formData.append(
        'file',
        filePayload
      );

      formData.append(
        'client',
        rec.client
      );

      formData.append(
        'duration',
        rec.duration
      );

      formData.append(
        'recordingId',
        rec.id
      );

      const response =
        await fetch(
          WEBHOOK_URL,
          {
            method: 'POST',

            body: formData,
          }
        );

      if (response.ok) {
        await updateRecordingStatus(
          rec.id,
          'Wysłano'
        );

        Alert.alert(
          'Sukces',
          'Nagranie zostało poprawnie wysłane do Make.'
        );

        return;
      }

      await updateRecordingStatus(
        rec.id,
        'Błąd wysyłania'
      );

      Alert.alert(
        'Błąd serwera',
        `Make zwrócił kod HTTP ${
          response.status
        }.\n\n` +
          'Nagranie pozostało zapisane w telefonie.'
      );

    } catch (error) {
      console.log(
        'Błąd wysyłania:',
        error
      );

      await updateRecordingStatus(
        rec.id,
        'Błąd wysyłania'
      );

      Alert.alert(
        'Błąd wysyłania',
        'Nie udało się zakończyć wysyłania. Nagranie nadal jest zapisane w telefonie i można ponowić próbę.'
      );
    }
  }


  /*
   * DASHBOARD
   */
  if (
    screen === 'dashboard'
  ) {
    return (
      <View style={styles.container}>

        <Text style={styles.header}>
          Nagrania
        </Text>

        <View
          style={
            styles.diagnosticBox
          }
        >

          <Text
            style={
              styles.diagnosticTitle
            }
          >
            DIAGNOSTYKA PAMIĘCI
          </Text>

          <Text
            style={
              styles.diagnosticText
            }
          >
            Pamięć: {memoryStatus}
          </Text>

          <Text
            style={
              styles.diagnosticText
            }
          >
            Zapisane rekordy:{' '}
            {savedRecordsCount}
          </Text>

          <Text
            style={
              styles.diagnosticText
            }
          >
            Test pamięci:{' '}
            {memoryTestValue}
          </Text>

          <TouchableOpacity
            style={
              styles.diagnosticButton
            }
            onPress={
              checkMemoryNow
            }
          >
            <Text
              style={
                styles
                  .diagnosticButtonText
              }
            >
              SPRAWDŹ PAMIĘĆ
            </Text>
          </TouchableOpacity>

        </View>

        <TextInput
          style={styles.input}
          placeholder="Wpisz nazwę firmy..."
          placeholderTextColor="#718096"
          value={clientName}
          onChangeText={
            setClientName
          }
        />

        <ScrollView
          style={styles.list}
        >

          {isLoadingRecordings && (
            <Text
              style={
                styles.emptyText
              }
            >
              Wczytywanie nagrań...
            </Text>
          )}

          {!isLoadingRecordings &&
            recordingsList.map(
              (rec) => (

                <TouchableOpacity
                  key={rec.id}
                  style={styles.card}
                  onPress={() => {
                    setSelectedRec(
                      rec
                    );

                    setActiveTab(
                      'Treść'
                    );

                    setScreen(
                      'analysis'
                    );
                  }}
                >

                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    {rec.client}
                  </Text>

                  <Text
                    style={
                      styles.cardMeta
                    }
                  >
                    {rec.date} o godz.{' '}
                    {rec.time}
                  </Text>

                  <Text
                    style={
                      styles
                        .cardDuration
                    }
                  >
                    ⏱️ Czas trwania:{' '}
                    {rec.duration}
                  </Text>

                  <Text
                    style={
                      styles
                        .cardFileSize
                    }
                  >
                    💾 Rozmiar:{' '}
                    {formatFileSize(
                      rec.fileSizeBytes
                    )}
                  </Text>

                  <Text
                    style={[
                      styles
                        .cardSubtitle,

                      rec.status ===
                        'Wysłano' &&
                        styles
                          .statusSuccess,

                      rec.status ===
                        'Błąd wysyłania' &&
                        styles
                          .statusError,

                      rec.status ===
                        'Wysyłanie...' &&
                        styles
                          .statusSending,
                    ]}
                  >
                    Status:{' '}
                    {rec.status}
                  </Text>

                </TouchableOpacity>
              )
            )}

          {!isLoadingRecordings &&
            recordingsList.length ===
              0 && (

              <Text
                style={
                  styles.emptyText
                }
              >
                Brak nagrań. Wpisz
                firmę i naciśnij
                mikrofon.
              </Text>
            )}

        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={
            startRecording
          }
        >
          <Text
            style={
              styles.fabIcon
            }
          >
            🎙️
          </Text>
        </TouchableOpacity>

      </View>
    );
  }


  /*
   * DYSKRETNY EKRAN NAGRYWANIA
   */
  if (
    screen === 'ambient'
  ) {
    return (
      <View
        style={
          styles.ambientContainer
        }
      >

        <TouchableOpacity
          style={
            styles.xButtonLeft
          }
          onPress={() => {}}
        >
          <Text
            style={styles.xText}
          >
            x
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.xButtonRight
          }
          onPress={
            stopRecording
          }
        >
          <Text
            style={styles.xText}
          >
            x
          </Text>
        </TouchableOpacity>

      </View>
    );
  }


  /*
   * SZCZEGÓŁY NAGRANIA
   */
  if (
    screen === 'analysis'
  ) {
    const progress =
      playbackDuration > 0
        ? playbackPosition /
          playbackDuration
        : 0;

    const sendButtonDisabled =
      selectedRec?.status ===
        'Wysyłanie...' ||
      selectedRec?.status ===
        'Wysłano';

    return (
      <View style={styles.container}>

        <TouchableOpacity
          onPress={() => {
            if (
              isPlaying &&
              sound
            ) {
              sound
                .stopAsync()
                .catch(() => {});

              setIsPlaying(false);
            }

            setPlaybackPosition(0);

            setPlaybackDuration(0);

            setScreen('dashboard');
          }}
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ← Wróć do listy
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.tabContainer
          }
        >

          <TouchableOpacity
            onPress={() =>
              setActiveTab(
                'Treść'
              )
            }
            style={[
              styles.tab,

              activeTab ===
                'Treść' &&
                styles.activeTab,
            ]}
          >
            <Text
              style={
                styles.tabText
              }
            >
              Treść
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              setActiveTab(
                'Analiza AI'
              )
            }
            style={[
              styles.tab,

              activeTab ===
                'Analiza AI' &&
                styles.activeTab,
            ]}
          >
            <Text
              style={
                styles.tabText
              }
            >
              Analiza AI
            </Text>
          </TouchableOpacity>

        </View>

        <View
          style={
            styles.contentArea
          }
        >

          {activeTab ===
          'Treść' ? (

            <ScrollView>

              <TouchableOpacity
                style={[
                  styles.playButton,

                  isPlaying &&
                    styles
                      .stopButtonActive,
                ]}
                onPress={() =>
                  togglePlayback(
                    selectedRec?.uri
                  )
                }
              >
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  {isPlaying
                    ? '⏹ Zatrzymaj'
                    : '▶ Odtwórz audio'}
                </Text>
              </TouchableOpacity>

              <View
                style={
                  styles
                    .timelineContainer
                }
              >

                <Text
                  style={
                    styles.timeLabel
                  }
                >
                  {formatTime(
                    playbackPosition
                  )}
                </Text>

                <TouchableOpacity
                  style={
                    styles.sliderTrack
                  }
                  activeOpacity={1}
                  onPress={(
                    event
                  ) => {
                    const locationX =
                      event.nativeEvent
                        .locationX;

                    const ratio =
                      Math.min(
                        Math.max(
                          locationX /
                            200,
                          0
                        ),
                        1
                      );

                    seekAudio(
                      ratio *
                        playbackDuration
                    );
                  }}
                >
                  <View
                    style={[
                      styles.sliderFill,

                      {
                        width:
                          `${
                            progress *
                            100
                          }%`,
                      },
                    ]}
                  />
                </TouchableOpacity>

                <Text
                  style={
                    styles.timeLabel
                  }
                >
                  {selectedRec
                    ?.duration ||
                    '0:00'}
                </Text>

              </View>

              <View
                style={
                  styles.fileInfoBox
                }
              >
                <Text
                  style={
                    styles.fileInfoText
                  }
                >
                  Rozmiar pliku:{' '}
                  {formatFileSize(
                    selectedRec
                      ?.fileSizeBytes
                  )}
                </Text>

                <Text
                  style={
                    styles.fileInfoText
                  }
                >
                  Plik w pamięci:{' '}
                  {selectedRec
                    ?.fileExists ===
                  false
                    ? 'NIE'
                    : 'TAK'}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles
                    .refreshInfoButton
                }
                onPress={
                  refreshSelectedFileInfo
                }
              >
                <Text
                  style={
                    styles
                      .refreshInfoButtonText
                  }
                >
                  SPRAWDŹ ROZMIAR PLIKU
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.exportButton
                }
                disabled={
                  isExporting
                }
                onPress={() =>
                  exportAudio(
                    selectedRec
                  )
                }
              >
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  {isExporting
                    ? '⏳ Otwieranie...'
                    : '📤 Eksportuj audio'}
                </Text>
              </TouchableOpacity>

              <Text
                style={
                  styles.exportHint
                }
              >
                W systemowym menu
                wybierz Dysk Google.
                Oryginalny plik
                pozostanie w aplikacji.
              </Text>

              <Text
                style={
                  styles.textOutput
                }
              >
                Transkrypcja pojawi
                się tutaj po
                zakończeniu
                przetwarzania.
              </Text>

            </ScrollView>

          ) : (

            <View>

              <Text
                style={
                  styles
                    .statusDetails
                }
              >
                Status:{' '}
                {selectedRec?.status}
              </Text>

              <Text
                style={
                  styles
                    .fileSizeDetails
                }
              >
                Rozmiar pliku:{' '}
                {formatFileSize(
                  selectedRec
                    ?.fileSizeBytes
                )}
              </Text>

              <Text
                style={
                  styles.textOutput
                }
              >
                Nagranie zostanie
                wysłane do Make.
              </Text>

              <TouchableOpacity
                disabled={
                  sendButtonDisabled
                }
                style={[
                  styles.sendButton,

                  sendButtonDisabled &&
                    styles
                      .sendButtonDisabled,

                  selectedRec
                    ?.status ===
                    'Błąd wysyłania' &&
                    styles
                      .retryButton,

                  selectedRec
                    ?.status ===
                    'Wysłano' &&
                    styles
                      .sentButton,
                ]}
                onPress={() =>
                  sendRecordingToWebhook(
                    selectedRec
                  )
                }
              >
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  {getSendButtonText(
                    selectedRec
                      ?.status
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles
                    .exportButtonSecondary
                }
                disabled={
                  isExporting
                }
                onPress={() =>
                  exportAudio(
                    selectedRec
                  )
                }
              >
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  📤 Eksportuj audio
                </Text>
              </TouchableOpacity>

            </View>
          )}

        </View>

      </View>
    );
  }

  return null;
}


const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        '#0A0F1D',
    },

    ambientContainer: {
      flex: 1,

      backgroundColor:
        '#05080F',
    },

    header: {
      color: '#E2E8F0',

      fontSize: 28,

      fontWeight: 'bold',

      paddingHorizontal: 20,

      marginTop: 50,

      marginBottom: 10,
    },

    diagnosticBox: {
      backgroundColor:
        '#111A30',

      borderWidth: 1,

      borderColor:
        '#F6AD55',

      borderRadius: 10,

      width: '90%',

      alignSelf: 'center',

      padding: 12,

      marginBottom: 15,
    },

    diagnosticTitle: {
      color: '#F6AD55',

      fontWeight: 'bold',

      marginBottom: 8,
    },

    diagnosticText: {
      color: '#E2E8F0',

      fontSize: 13,

      marginBottom: 3,
    },

    diagnosticButton: {
      backgroundColor:
        '#2D3748',

      marginTop: 8,

      padding: 8,

      borderRadius: 6,

      alignItems: 'center',
    },

    diagnosticButtonText: {
      color: '#FFFFFF',

      fontSize: 12,

      fontWeight: 'bold',
    },

    input: {
      backgroundColor:
        'rgba(26, 38, 77, 0.4)',

      color: '#FFF',

      height: 50,

      borderColor:
        'rgba(0, 209, 255, 0.3)',

      borderWidth: 1,

      borderRadius: 10,

      paddingHorizontal: 15,

      width: '90%',

      alignSelf: 'center',

      marginBottom: 20,

      fontSize: 16,
    },

    list: {
      width: '100%',
    },

    card: {
      backgroundColor:
        'rgba(26, 38, 77, 0.6)',

      padding: 20,

      borderRadius: 15,

      marginBottom: 15,

      borderWidth: 1,

      borderColor:
        'rgba(0, 209, 255, 0.2)',

      width: '90%',

      alignSelf: 'center',
    },

    cardTitle: {
      color: '#FFF',

      fontSize: 18,

      fontWeight: 'bold',
    },

    cardMeta: {
      color: '#A0AEC0',

      fontSize: 12,

      marginTop: 4,
    },

    cardDuration: {
      color: '#00D1FF',

      fontSize: 14,

      fontWeight: '600',

      marginTop: 6,

      marginBottom: 2,
    },

    cardFileSize: {
      color: '#CBD5E0',

      fontSize: 13,

      marginTop: 4,
    },

    cardSubtitle: {
      color: '#A0AEC0',

      marginTop: 4,
    },

    statusSuccess: {
      color: '#68D391',
    },

    statusError: {
      color: '#FC8181',
    },

    statusSending: {
      color: '#F6AD55',
    },

    emptyText: {
      color: '#718096',

      textAlign: 'center',

      marginTop: 50,

      paddingHorizontal: 20,

      lineHeight: 22,
    },

    fab: {
      position: 'absolute',

      bottom: 50,

      left: '50%',

      marginLeft: -32.5,

      backgroundColor:
        '#00D1FF',

      width: 65,

      height: 65,

      borderRadius: 32.5,

      justifyContent:
        'center',

      alignItems: 'center',
    },

    fabIcon: {
      fontSize: 28,
    },

    xButtonLeft: {
      position: 'absolute',

      top: 40,

      left: 20,

      padding: 10,
    },

    xButtonRight: {
      position: 'absolute',

      top: 40,

      right: 20,

      padding: 10,
    },

    xText: {
      color:
        'rgba(255,255,255,0.15)',

      fontSize: 24,

      fontFamily:
        'monospace',
    },

    sendButton: {
      backgroundColor:
        '#1A264D',

      padding: 15,

      borderRadius: 10,

      alignItems: 'center',

      marginVertical: 10,

      borderWidth: 1,

      borderColor:
        '#00D1FF',
    },

    sendButtonDisabled: {
      opacity: 0.55,
    },

    retryButton: {
      borderColor:
        '#FC8181',
    },

    sentButton: {
      backgroundColor:
        '#22543D',

      borderColor:
        '#68D391',
    },

    exportButton: {
      backgroundColor:
        '#2B6CB0',

      padding: 15,

      borderRadius: 10,

      alignItems: 'center',

      marginTop: 12,
    },

    exportButtonSecondary: {
      backgroundColor:
        '#2B6CB0',

      padding: 15,

      borderRadius: 10,

      alignItems: 'center',

      marginTop: 14,
    },

    exportHint: {
      color: '#A0AEC0',

      fontSize: 12,

      lineHeight: 18,

      marginTop: 8,
    },

    refreshInfoButton: {
      backgroundColor:
        '#2D3748',

      padding: 11,

      borderRadius: 8,

      alignItems: 'center',

      marginTop: 10,
    },

    refreshInfoButtonText: {
      color: '#FFFFFF',

      fontSize: 12,

      fontWeight: 'bold',
    },

    fileInfoBox: {
      backgroundColor:
        '#111A30',

      borderWidth: 1,

      borderColor:
        '#2D3748',

      borderRadius: 8,

      padding: 12,

      marginTop: 8,
    },

    fileInfoText: {
      color: '#E2E8F0',

      fontSize: 13,

      marginBottom: 3,
    },

    fileSizeDetails: {
      color: '#CBD5E0',

      marginTop: 8,
    },

    buttonText: {
      color: '#FFF',

      fontWeight: 'bold',

      fontSize: 16,
    },

    statusDetails: {
      color: '#E2E8F0',

      fontWeight: 'bold',

      fontSize: 16,

      marginTop: 5,
    },

    tabContainer: {
      flexDirection: 'row',

      justifyContent:
        'space-around',

      borderBottomWidth: 1,

      borderBottomColor:
        '#1A264D',

      marginBottom: 20,
    },

    tab: {
      paddingVertical: 15,
    },

    activeTab: {
      borderBottomWidth: 2,

      borderBottomColor:
        '#00D1FF',
    },

    tabText: {
      color: '#E2E8F0',

      fontSize: 16,
    },

    contentArea: {
      flex: 1,

      paddingHorizontal: 20,
    },

    textOutput: {
      color: '#A0AEC0',

      lineHeight: 24,

      marginTop: 15,
    },

    playButton: {
      backgroundColor:
        '#00D1FF',

      padding: 15,

      borderRadius: 10,

      alignItems: 'center',

      marginBottom: 15,
    },

    stopButtonActive: {
      backgroundColor:
        '#E53E3E',
    },

    timelineContainer: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'center',

      marginVertical: 15,

      width: '100%',
    },

    timeLabel: {
      color: '#A0AEC0',

      fontSize: 12,

      width: 45,

      textAlign: 'center',
    },

    sliderTrack: {
      width: 200,

      height: 6,

      backgroundColor:
        'rgba(255, 255, 255, 0.2)',

      borderRadius: 3,

      marginHorizontal: 10,

      overflow: 'hidden',

      position: 'relative',
    },

    sliderFill: {
      height: '100%',

      backgroundColor:
        '#00D1FF',
    },

    backButton: {
      padding: 15,

      marginTop: 30,
    },

    backButtonText: {
      color: '#00D1FF',
    },
  });

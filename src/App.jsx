import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { TypographyH2, TypographyP } from './components/typography';
import { Region, WaveForm, WaveSurfer } from 'wavesurfer-react';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

function App() {
  const fileInputRef = useRef();
  const [audio, setAudio] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [regionData, setRegionData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const wavesurferRef = useRef(null);

  // import { FFmpeg } from '@ffmpeg/ffmpeg';
  // import { fetchFile, toBlobURL } from '@ffmpeg/util';

  const [loaded, setLoaded] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    // toBlobURL is used to bypass CORS issue, urls with the same
    // domain can be used directly.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setLoaded(true);

    console.log('FFmpeg is ready');
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (event) => {
    const file = event.target.files[0];
    console.log(file);

    const reader = new FileReader();

    reader.readAsDataURL(file);

    setAudioUrl(URL.createObjectURL(file));

    if (file) {
      setAudio(file);
    }
  };

  const plugins = [
    {
      key: 'timeline',
      plugin: TimelinePlugin,
      options: {
        container: '#timeline',
      },
    },
    {
      key: 'regions',
      plugin: RegionsPlugin,
      options: { dragSelection: true },
    },
  ];
  const [regions, setRegions] = useState([
    {
      id: 'region-1',
      start: 0,
      end: 15,
      color: 'rgba(98, 86, 202, .5)',
      data: {
        systemRegionId: 33,
      },
    },
  ]);
  const regionsRef = useRef(regions);

  useEffect(() => {
    setRegionData(regions[0]);
  }, [regions]);

  const regionCreatedHandler = useCallback(
    (region) => {
      if (region.data.systemRegionId) return;

      setRegions([...regionsRef.current, { ...region, data: { ...region.data, systemRegionId: -1 } }]);
    },
    [regionsRef]
  );

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  const handleWSMount = useCallback(
    (waveSurfer) => {
      wavesurferRef.current = waveSurfer;

      if (wavesurferRef.current) {
        wavesurferRef.current.on('region-created', regionCreatedHandler);

        wavesurferRef.current.on('ready', () => {
          setIsLoaded(true);
          setIsPlaying(true);

          // Create initial region after WaveSurfer is ready
          regions.forEach((region) => {
            wavesurferRef.current.addRegion(region);
          });
        });

        wavesurferRef.current.on('click', () => {});
      }
    },
    [regionCreatedHandler, regions]
  );

  const handleRegionUpdate = useCallback((region) => {
    // make only the region is playable

    setRegionData(region);

    const start = region.start;

    wavesurferRef.current.seekTo(start / wavesurferRef.current.getDuration());

    wavesurferRef.current.play();
  }, []);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    wavesurferRef.current.un('audioprocess');

    wavesurferRef.current.on('audioprocess', (time) => {
      if (time >= regionData.end) {
        wavesurferRef.current.seekTo(regionData.start / wavesurferRef.current.getDuration());
        wavesurferRef.current.pause();
        setIsPlaying(false);
      }
    });
  }, [regionData]);

  const play = useCallback(() => {
    wavesurferRef.current.playPause();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  async function trim() {
    if (!loaded) {
      console.error('FFmpeg is not loaded');
      return;
    }

    try {
      const ffmpeg = ffmpegRef.current;
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      await ffmpeg.writeFile('audio.mp3', new Uint8Array(arrayBuffer));

      await ffmpeg.exec(['-i', 'audio.mp3', '-ss', regionData.start.toString(), '-to', regionData.end.toString(), 'output.mp3']);

      const data = await ffmpeg.readFile('output.mp3');

      const blob = new Blob([data.buffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.mp3';
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      await ffmpeg.deleteFile('audio.mp3');
      await ffmpeg.deleteFile('output.mp3');
    } catch (error) {
      console.error('Error during trimming:', error);
    }
  }
  return (
    <>
      {audio === null ? (
        <>
          <TypographyH2 text="Upload Audio" />
          <div className="flex flex-col items-center justify-center h-screen -mt-36">
            <button
              onClick={() => fileInputRef.current.click()}
              type="button"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
            >
              Upload Audio
            </button>
            <input onChange={handleChange} multiple={false} ref={fileInputRef} type="file" accept="audio/*" className="hidden" />
          </div>{' '}
        </>
      ) : (
        <>
          <TypographyH2 text="Trim Audio" />

          <TypographyP text={`Audio file: ${audio.name}`} />

          <div className="mt-16">
            <WaveSurfer
              plugins={plugins}
              onMount={handleWSMount}
              cursorColor="transparent"
              container="#waveform"
              url={audioUrl}
              waveColor={'#A594F9'}
              barHeight={0.8}
              progressColor={'#CDC1FF'}
              barWidth={2}
              dragToSeek={false}
              autoplay={true}
              interact={false}
            >
              <WaveForm id="waveform" />
              <div id="timeline" />
              {isLoaded && regions.map((regionProps) => <Region onUpdateEnd={handleRegionUpdate} key={regionProps.id} {...regionProps} />)}
            </WaveSurfer>

            <div className="controls mt-10 flex justify-center">
              <button
                onClick={play}
                type="button"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                onClick={trim}
                type="button"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              >
                Trim
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default App;

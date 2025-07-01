/**
 * A simple utility for QR code scanning
 * Requires jsQR library to be available
 */

interface Point {
  x: number;
  y: number;
}

export interface QRCodeDetectOptions {
  inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth';
}

export interface QRCodeResult {
  binaryData: Uint8Array;
  data: string;
  chunks: any[];
  version: number;
  location: {
    topRightCorner: Point;
    topLeftCorner: Point;
    bottomRightCorner: Point;
    bottomLeftCorner: Point;
  };
}

export class QRScanner {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private scanInterval: number | null = null;
  private onDetected: (result: QRCodeResult) => void;
  private jsQRPromise: Promise<any> | null = null;
  private isActive: boolean = false;
  private startTime: number = 0;
  
  constructor(onDetected: (result: QRCodeResult) => void) {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    this.context = context;
    this.onDetected = onDetected;
    
    // Dynamically import jsQR
    this.jsQRPromise = this.loadJsQR();
    
    // Log constructor completion
    console.log("QRScanner instance created");
  }
  
  private async loadJsQR() {
    try {
      console.log('Loading jsQR library...');
      
      // Check if jsQR is already available
      if (typeof (window as any).jsQR === 'function') {
        console.log('jsQR is already available');
        return (window as any).jsQR;
      }
      
      // We'll add the script tag to load jsQR from CDN
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        
        // Try using unpkg as primary source
        script.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js';
        
        script.onload = () => {
          // Check if window.jsQR is available
          if (typeof (window as any).jsQR === 'function') {
            console.log('jsQR library loaded successfully');
            resolve((window as any).jsQR);
          } else {
            console.error('jsQR library loaded but function not available');
            reject(new Error('jsQR library loaded but function not available'));
          }
        };
        
        script.onerror = () => {
          console.error('Failed to load jsQR from unpkg, trying jsdelivr...');
          
          // Try using jsdelivr as fallback
          const fallbackScript = document.createElement('script');
          fallbackScript.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
          
          fallbackScript.onload = () => {
            if (typeof (window as any).jsQR === 'function') {
              console.log('jsQR library loaded successfully from fallback');
              resolve((window as any).jsQR);
            } else {
              console.error('jsQR library loaded from fallback but function not available');
              reject(new Error('jsQR library loaded but function not available'));
            }
          };
          
          fallbackScript.onerror = () => {
            console.error('Failed to load jsQR from both sources');
            reject(new Error('Failed to load jsQR library from all sources'));
          };
          
          document.head.appendChild(fallbackScript);
        };
        
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Error loading jsQR:', error);
      throw error;
    }
  }
  
  /**
   * Start scanning for QR codes from a video element
   */
  public async start(video: HTMLVideoElement) {
    try {
      // If already active, stop first to ensure clean state
      if (this.isActive) {
        console.log('Scanner already active, stopping before restart');
        this.stop();
      }
      
      if (!video) {
        throw new Error('Video element is null or undefined');
      }
      
      // Store start time for diagnostic purposes
      this.startTime = Date.now();
      console.log(`Starting QR scanner with video element (id=${video.id}, width=${video.width}, height=${video.height})`);
      
      // Ensure jsQR is loaded
      await this.jsQRPromise;
      
      // Set as active early to prevent concurrent start attempts
      this.isActive = true;
      this.video = video;
      
      // Setup camera stream if not already set
      if (!video.srcObject) {
        console.log('Setting up camera stream...');
        try {
          // Try with ideal settings first
          const constraints = {
            video: { 
              facingMode: 'environment', // Prefer back camera
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };
          
          try {
            // First try with ideal settings
            console.log('Requesting camera with preferred settings...');
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera stream obtained with tracks:', stream.getTracks().length);
            
            // Verify video element is still valid before proceeding
            if (!this.video || this.video !== video) {
              console.warn('Video element changed during initialization');
              stream.getTracks().forEach(track => track.stop());
              throw new Error('Video element reference changed during initialization');
            }
            
            video.srcObject = stream;
            console.log('Camera stream attached to video element');
          } catch (preferredError) {
            console.warn('Could not access camera with preferred settings, trying fallback...', preferredError);
            
            // Fallback to basic constraints
            const fallbackConstraints = {
              video: true,
              audio: false
            };
            
            try {
              console.log('Requesting camera with fallback settings...');
              const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
              console.log('Fallback camera stream obtained with tracks:', fallbackStream.getTracks().length);
              
              // Verify video element is still valid
              if (!this.video || this.video !== video) {
                console.warn('Video element changed during fallback initialization');
                fallbackStream.getTracks().forEach(track => track.stop());
                throw new Error('Video element reference changed during fallback initialization');
              }
              
              video.srcObject = fallbackStream;
              console.log('Fallback camera stream attached to video element');
            } catch (fallbackError: any) {
              // If still failing, provide detailed error information
              console.error('Camera access with fallback settings failed:', fallbackError);
              
              // Check if it's a permission error
              if (fallbackError.name === 'NotAllowedError' || fallbackError.name === 'PermissionDeniedError') {
                throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
              } else if (fallbackError.name === 'NotFoundError' || fallbackError.name === 'DevicesNotFoundError') {
                throw new Error('No camera found on this device.');
              } else if (fallbackError.name === 'NotReadableError' || fallbackError.name === 'TrackStartError') {
                throw new Error('Camera is in use by another application or not accessible.');
              } else {
                throw new Error(`Could not access camera: ${fallbackError.message || 'Unknown error'}`);
              }
            }
          }
          
          // Verify we have a valid srcObject
          if (!video.srcObject) {
            throw new Error('Failed to set video source after obtaining camera stream');
          }
          
          // Wait for video to be ready
          await new Promise<void>((resolve, reject) => {
            // Verify video element is still valid
            if (!this.video || this.video !== video) {
              reject(new Error('Video element reference changed during metadata loading'));
              return;
            }
            
            // Add timeout to handle stalled video loading
            const timeout = setTimeout(() => {
              reject(new Error('Video loading timed out. Camera may not be working properly.'));
            }, 5000);
            
            // Handler for metadata load
            const handleMetadataLoaded = () => {
              clearTimeout(timeout);
              console.log('Video metadata loaded, attempting to play...');
              
              // Verify video element is still valid before playing
              if (!this.video || this.video !== video) {
                reject(new Error('Video element reference changed before play'));
                return;
              }
              
              video.play().then(() => {
                console.log('Camera stream started successfully');
                resolve();
              }).catch(err => {
                console.error('Failed to play video:', err);
                reject(new Error(`Video cannot be played: ${err.message}`));
              });
            };
            
            // Handler for video error
            const handleVideoError = (err: Event) => {
              clearTimeout(timeout);
              console.error('Video element error:', err);
              reject(new Error('Error loading video from camera'));
            };
            
            // Set up event handlers
            video.addEventListener('loadedmetadata', handleMetadataLoaded, { once: true });
            video.addEventListener('error', handleVideoError, { once: true });
            
            // Cleanup function to remove event listeners if promise resolves or rejects elsewhere
            const cleanup = () => {
              video.removeEventListener('loadedmetadata', handleMetadataLoaded);
              video.removeEventListener('error', handleVideoError);
            };
            
            // Ensure cleanup happens when promise resolves or rejects
            setTimeout(() => cleanup, 0);
          });
        } catch (streamError: any) {
          console.error('Error getting camera stream:', streamError);
          
          // Provide more specific error messages based on the error
          let errorMessage = 'Camera access failed';
          
          if (streamError.name === 'NotAllowedError' || streamError.name === 'PermissionDeniedError') {
            errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
          } else if (streamError.name === 'NotFoundError' || streamError.name === 'DevicesNotFoundError') {
            errorMessage = 'No camera found on this device.';
          } else if (streamError.name === 'NotReadableError' || streamError.name === 'TrackStartError') {
            errorMessage = 'Camera is in use by another application or not accessible.';
          } else if (streamError.message) {
            errorMessage = `Camera access denied or not available: ${streamError.message}`;
          }
          
          throw new Error(errorMessage);
        }
      } else {
        console.log('Camera stream already set on video element');
      }
      
      // Final verification before setting up canvas
      if (!this.video || this.video !== video) {
        throw new Error('Video element reference changed before canvas setup');
      }
      
      // Setup canvas - handle potential zero dimensions
      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;
      
      if (videoWidth === 0 || videoHeight === 0) {
        console.warn('Video dimensions are zero, using default dimensions');
        this.canvas.width = 640;
        this.canvas.height = 480;
      } else {
        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;
      }
      
      console.log(`Canvas dimensions set to ${this.canvas.width}x${this.canvas.height}`);
      
      // Clear any existing interval
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      
      // Start scan interval if still active
      if (this.isActive) {
        console.log('Starting QR code scanning interval');
        this.scanInterval = window.setInterval(() => this.scan(), 200);
        
        // Run an immediate scan to catch any issues early
        setTimeout(() => {
          if (this.isActive) {
            this.scan();
          }
        }, 100);
      } else {
        console.warn('Scanner became inactive during initialization, not starting interval');
      }
      
      const setupDuration = Date.now() - this.startTime;
      console.log(`QR scanner initialization completed in ${setupDuration}ms`);
      
    } catch (error) {
      const setupDuration = Date.now() - this.startTime;
      console.error(`Failed to start QR scanner after ${setupDuration}ms:`, error);
      
      // Make sure to clean up any resources if we fail
      this.isActive = false;
      this.stop();
      throw error;
    }
  }
  
  /**
   * Stop scanning for QR codes and release camera resources
   */
  public stop() {
    console.log('Stopping QR scanner');
    
    // Mark as inactive immediately
    this.isActive = false;
    
    // Stop the scanning interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    // Release camera resources
    if (this.video && this.video.srcObject) {
      try {
        const stream = this.video.srcObject as MediaStream;
        const tracks = stream.getTracks();
        
        if (tracks.length > 0) {
          console.log(`Stopping ${tracks.length} camera tracks`);
          tracks.forEach(track => {
            console.log(`Stopping camera track: ${track.kind}, ID: ${track.id}`);
            track.stop();
          });
        } else {
          console.log('No tracks found in video stream');
        }
        
        // Clear the srcObject
        this.video.srcObject = null;
        console.log('Cleared video srcObject');
      } catch (error) {
        console.error('Error stopping camera tracks:', error);
      }
    } else {
      console.log('No video element or stream to clean up');
    }
    
    // Release video reference
    this.video = null;
    
    console.log('QR scanner stopped successfully');
  }
  
  /**
   * Perform a single scan for QR codes in the current video frame
   */
  private scan() {
    // First check if scanner is still active
    if (!this.isActive) {
      console.log('Scanner inactive - scan aborted');
      return;
    }
    
    // Check if video is available
    if (!this.video) {
      console.warn('Video element is missing during scan');
      return;
    }
    
    // Try-catch the entire function to handle any unexpected errors
    try {
      // Verify the video element is still accessible and not detached
      let videoValid = true;
      try {
        // Just try to access some property to see if the video is still accessible
        const testAccess = this.video.id; // Any property would do
        
        // Check video dimensions
        if (!this.video.videoWidth || !this.video.videoHeight) {
          // Only log occasionally to avoid console spam
          if (Math.random() < 0.1) { // Log approximately 10% of the time
            console.log('Waiting for video dimensions to be available...');
          }
          videoValid = false;
        }
      } catch (videoError) {
        console.error('Error accessing video properties - element may be detached:', videoError);
        videoValid = false;
        // This could indicate the video element is detached from DOM or null
        return;
      }
      
      if (!videoValid) {
        return; // Skip this scan if video isn't fully initialized
      }
      
      // Check if video has necessary data
      if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
        // Not ready yet, will try again on next interval
        return;
      }
      
      // Verify jsQR is loaded
      const jsQR = (window as any).jsQR;
      if (!jsQR) {
        // Only log occasionally to avoid console spam
        if (Math.random() < 0.1) {
          console.warn('jsQR library not available yet, waiting for library to load');
        }
        return;
      }
      
      // Set up canvas with appropriate dimensions
      try {
        // Handle potential zero dimensions
        if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
          console.warn('Video dimensions are zero, using default dimensions');
          this.canvas.width = 640;
          this.canvas.height = 480;
        } else {
          // Update canvas dimensions to match video
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
        }
      } catch (dimensionError) {
        console.error('Error setting canvas dimensions:', dimensionError);
        return; // Skip this frame
      }
      
      // Final safety check before drawing
      if (!this.video || !this.isActive || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
        console.warn('Video element became invalid before drawing to canvas');
        return;
      }
      
      // Draw the current video frame to the canvas
      try {
        this.context.drawImage(
          this.video, 
          0, 
          0, 
          this.canvas.width, 
          this.canvas.height
        );
      } catch (drawError) {
        console.error('Error drawing video to canvas:', drawError);
        
        // If this is a "Failed to execute 'drawImage'" error, the video element might be problematic
        if (drawError instanceof DOMException && drawError.message.includes('drawImage')) {
          console.error('Could not draw video to canvas. Video element may be invalid.');
          
          // If we get this error repeatedly, we might want to restart the scanner
          // This could be implemented as a counter that triggers after multiple failures
        }
        return; // Skip this frame
      }
      
      // Get the image data from the canvas for QR code processing
      let imageData;
      try {
        imageData = this.context.getImageData(
          0, 
          0, 
          this.canvas.width, 
          this.canvas.height
        );
      } catch (imageDataError) {
        // This can happen with CORS issues or if canvas is empty
        console.error('Error getting image data from canvas:', imageDataError);
        return; // Skip this frame
      }
      
      // Verify we have valid image data
      if (!imageData || !imageData.data || imageData.data.length === 0) {
        console.warn('Invalid image data received from canvas');
        return;
      }
      
      // We're still active, process the frame for QR codes
      try {
        // Process image data to look for QR codes
        const code = jsQR(
          imageData.data, 
          imageData.width, 
          imageData.height, 
          { inversionAttempts: 'attemptBoth' } // Try both regular and inverted image
        );
        
        // If a QR code was found, call the callback
        if (code) {
          console.log('QR code detected with data:', code.data);
          // Call the callback with the detected QR code
          this.onDetected(code);
        }
      } catch (qrError) {
        console.error('Error processing QR code:', qrError);
      }
    } catch (error) {
      console.error('Unexpected error during QR scan:', error);
      
      // If this is a critical error that indicates the scanner is broken
      // we might want to trigger a full reset, but let's just log for now
    }
  }
}
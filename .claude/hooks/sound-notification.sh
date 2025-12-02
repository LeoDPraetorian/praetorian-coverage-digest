#!/bin/bash
# Sound notification system for Claude Code hooks
# Plays sound when agent finishes and waits for user input

# Use absolute path anchored to project root to prevent creation in wrong directories
SOUND_CONFIG_FILE="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/scripts/sound/sound-config.json"
DEFAULT_SOUND_FILE="$HOME/.claude/sounds/completion.aiff"

# Initialize sound config if it doesn't exist
init_sound_config() {
    if [ ! -f "$SOUND_CONFIG_FILE" ]; then
        mkdir -p "$(dirname "$SOUND_CONFIG_FILE")"
        cat > "$SOUND_CONFIG_FILE" <<EOF
{
  "enabled": true,
  "sound_file": "$DEFAULT_SOUND_FILE",
  "volume": 0.5
}
EOF
    fi
}

# Check if sound is enabled
is_sound_enabled() {
    init_sound_config
    if [ -f "$SOUND_CONFIG_FILE" ]; then
        jq -r '.enabled // true' "$SOUND_CONFIG_FILE" 2>/dev/null
    else
        echo "true"
    fi
}

# Get sound file path
get_sound_file() {
    init_sound_config
    if [ -f "$SOUND_CONFIG_FILE" ]; then
        jq -r '.sound_file // "'"$DEFAULT_SOUND_FILE"'"' "$SOUND_CONFIG_FILE" 2>/dev/null
    else
        echo "$DEFAULT_SOUND_FILE"
    fi
}

# Get volume setting
get_volume() {
    init_sound_config
    if [ -f "$SOUND_CONFIG_FILE" ]; then
        jq -r '.volume // 0.5' "$SOUND_CONFIG_FILE" 2>/dev/null
    else
        echo "0.5"
    fi
}

# Toggle sound on/off
toggle_sound() {
    init_sound_config
    local current_state=$(is_sound_enabled)
    local new_state
    
    if [ "$current_state" = "true" ]; then
        new_state="false"
        echo "🔇 Sound notifications disabled"
    else
        new_state="true"
        echo "🔊 Sound notifications enabled"
    fi
    
    # Update config
    local temp_file=$(mktemp)
    jq --argjson enabled "$new_state" '.enabled = $enabled' "$SOUND_CONFIG_FILE" > "$temp_file"
    mv "$temp_file" "$SOUND_CONFIG_FILE"
    
    return 0
}

# Set custom sound file
set_sound_file() {
    local sound_file="$1"
    init_sound_config
    
    if [ ! -f "$sound_file" ]; then
        echo "❌ Sound file not found: $sound_file"
        return 1
    fi
    
    local temp_file=$(mktemp)
    jq --arg sound_file "$sound_file" '.sound_file = $sound_file' "$SOUND_CONFIG_FILE" > "$temp_file"
    mv "$temp_file" "$SOUND_CONFIG_FILE"
    
    echo "✅ Sound file set to: $sound_file"
}

# Set volume (0.0 to 1.0)
set_volume() {
    local volume="$1"
    init_sound_config
    
    # Validate volume is between 0 and 1
    if ! echo "$volume" | grep -qE '^[0-9]*\.?[0-9]+$' || [ "$(echo "$volume > 1" | bc -l)" -eq 1 ] || [ "$(echo "$volume < 0" | bc -l)" -eq 1 ]; then
        echo "❌ Volume must be between 0.0 and 1.0"
        return 1
    fi
    
    local temp_file=$(mktemp)
    jq --argjson volume "$volume" '.volume = $volume' "$SOUND_CONFIG_FILE" > "$temp_file"
    mv "$temp_file" "$SOUND_CONFIG_FILE"
    
    echo "✅ Volume set to: $volume"
}

# Play completion sound
play_completion_sound() {
    local enabled=$(is_sound_enabled)
    
    if [ "$enabled" = "false" ]; then
        return 0
    fi
    
    local sound_file=$(get_sound_file)
    local volume=$(get_volume)
    
    # Create default sound if it doesn't exist
    if [ ! -f "$sound_file" ]; then
        mkdir -p "$(dirname "$sound_file")"
        # Create a simple beep sound using system bell or afplay on macOS
        if command -v afplay >/dev/null 2>&1; then
            # Generate a simple notification sound
            cat > /tmp/create_completion_sound.py <<'EOF'
import numpy as np
import wave
import struct
import sys

def create_completion_sound(filename, duration=0.5, frequency=800):
    sample_rate = 44100
    samples = int(sample_rate * duration)
    
    # Create a pleasant notification tone (two-tone beep)
    t = np.linspace(0, duration, samples, False)
    
    # First tone (higher pitch)
    tone1 = np.sin(frequency * 2.0 * np.pi * t[:samples//2]) * 0.3
    # Second tone (lower pitch) 
    tone2 = np.sin((frequency * 0.75) * 2.0 * np.pi * t[samples//2:]) * 0.3
    
    # Combine and apply envelope
    audio = np.concatenate([tone1, tone2])
    envelope = np.exp(-t * 3)  # Fade out
    audio = audio * envelope
    
    # Convert to 16-bit integers
    audio = (audio * 32767).astype(np.int16)
    
    # Write to WAV file
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())

if __name__ == "__main__":
    create_completion_sound(sys.argv[1] if len(sys.argv) > 1 else "/tmp/completion.wav")
EOF
            
            if command -v python3 >/dev/null 2>&1 && python3 -c "import numpy" 2>/dev/null; then
                python3 /tmp/create_completion_sound.py "$sound_file"
            else
                # Fallback: use system sound or create simple AIFF
                if [ "$(uname)" = "Darwin" ]; then
                    # Use system sound on macOS
                    sound_file="/System/Library/Sounds/Ping.aiff"
                else
                    # Create a simple beep for other systems
                    echo "Warning: Using system bell as fallback"
                    return 0
                fi
            fi
            rm -f /tmp/create_completion_sound.py
        fi
    fi
    
    # Play the sound
    if [ -f "$sound_file" ]; then
        if command -v afplay >/dev/null 2>&1; then
            # macOS
            afplay "$sound_file" -v "$volume" &
        elif command -v aplay >/dev/null 2>&1; then
            # Linux with ALSA
            aplay "$sound_file" &
        elif command -v paplay >/dev/null 2>&1; then
            # Linux with PulseAudio
            paplay "$sound_file" &
        elif command -v mpv >/dev/null 2>&1; then
            # mpv as fallback
            mpv --no-video --volume=$(echo "$volume * 100" | bc -l) "$sound_file" >/dev/null 2>&1 &
        else
            # System bell fallback
            echo -e '\a'
        fi
    else
        # System bell fallback
        echo -e '\a'
    fi
}

# Show current status
show_status() {
    init_sound_config
    local enabled=$(is_sound_enabled)
    local sound_file=$(get_sound_file)
    local volume=$(get_volume)
    
    echo "🔊 Sound Notification Status:"
    echo "  Enabled: $enabled"
    echo "  Sound File: $sound_file"
    echo "  Volume: $volume"
    
    if [ -f "$sound_file" ]; then
        echo "  File Status: ✅ Found"
    else
        echo "  File Status: ❌ Not found (will create default)"
    fi
}

# Main command handler
case "$1" in
    "play")
        play_completion_sound
        ;;
    "toggle")
        toggle_sound
        ;;
    "status")
        show_status
        ;;
    "set-file")
        set_sound_file "$2"
        ;;
    "set-volume")
        set_volume "$2"
        ;;
    "test")
        echo "🔊 Testing sound notification..."
        play_completion_sound
        ;;
    *)
        echo "Usage: $0 {play|toggle|status|set-file|set-volume|test}"
        echo ""
        echo "Commands:"
        echo "  play       - Play completion sound"
        echo "  toggle     - Toggle sound on/off"
        echo "  status     - Show current configuration"
        echo "  set-file   - Set custom sound file path"
        echo "  set-volume - Set volume (0.0 to 1.0)"
        echo "  test       - Test the current sound"
        exit 1
        ;;
esac
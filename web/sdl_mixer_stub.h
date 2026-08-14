#ifndef WOLF4SDL_WEB_SDL_MIXER_STUB_H
#define WOLF4SDL_WEB_SDL_MIXER_STUB_H

/*
 * Wolf4SDL uses SDL_mixer for the original desktop build.  Emscripten's
 * legacy SDL1 compatibility layer does not ship an SDL1 mixer port, so keep
 * the sound-manager ABI alive while the browser port brings up the game.
 * The browser build is intentionally silent until a WebAudio mixer is added;
 * no retail data is embedded by this header.
 */

#include <SDL.h>

#define MIX_CHANNELS 32

typedef struct Mix_Chunk
{
    Uint8 *abuf;
    Uint32 alen;
    Uint8 volume;
} Mix_Chunk;

static inline int Mix_OpenAudio(int, Uint16, int, int)
{
    return 0;
}

static inline const char *Mix_GetError(void)
{
    return "SDL_mixer audio is disabled in the browser build";
}

static inline void Mix_CloseAudio(void) {}
static inline void Mix_ReserveChannels(int) {}
static inline int Mix_GroupChannels(int, int, int) { return 0; }
static inline int Mix_GroupAvailable(int) { return 0; }
static inline int Mix_GroupOldest(int) { return 0; }
static inline int Mix_HaltChannel(int) { return 0; }
static inline int Mix_SetPanning(int, Uint8, Uint8) { return 0; }
static inline void Mix_ChannelFinished(void (*)(int)) {}
static inline void Mix_HookMusic(void (*)(void *, Uint8 *, int), void *) {}

static inline Mix_Chunk *Mix_LoadWAV_RW(SDL_RWops *, int)
{
    return 0;
}

static inline void Mix_FreeChunk(Mix_Chunk *) {}
static inline int Mix_PlayChannel(int, Mix_Chunk *, int) { return 0; }

#endif

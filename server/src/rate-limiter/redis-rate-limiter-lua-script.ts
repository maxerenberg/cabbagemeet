import { defineScript } from 'redis';

// Adapted from https://developer.redis.com/develop/dotnet/aspnetcore/rate-limiting/sliding-window/
// KEYS[1]: name of sorted set
// ARGV[1]: window size in seconds
// ARGV[2]: max. number of requests within the given window
const luaScriptText = `
local current_time = redis.call('TIME')
local trim_time = tonumber(current_time[1]) - ARGV[1]
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, trim_time)
local request_count = redis.call('ZCARD', KEYS[1])

if request_count < tonumber(ARGV[2]) then
    redis.call('ZADD', KEYS[1], current_time[1], current_time[1] .. current_time[2])
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    return 0
end
return 1
`;

export const luaScriptConfig = {
  tryAddRequestIfWithinLimits: defineScript({
    NUMBER_OF_KEYS: 1,
    SCRIPT: luaScriptText,
    transformArguments(
      key: string,
      intervalSeconds: number,
      limit: number,
    ): string[] {
      return [key, intervalSeconds.toString(), limit.toString()];
    },
    transformReply(this, reply: number): boolean {
      // Note that 0 means success in our script
      return reply === 0;
    },
  }),
};

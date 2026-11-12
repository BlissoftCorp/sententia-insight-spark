# Architecture

- Bound initial analytics reads with a shared timeout and return their existing typed error state so an unavailable database cannot block page rendering indefinitely.
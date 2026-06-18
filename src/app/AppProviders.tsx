import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import { AuthProvider } from "../features/auth/AuthProvider";
import { queryKeys } from "../shared/queryKeys";

const liveDataStaleTimeMs = 15 * 1000;
const dailyDataStaleTimeMs = 60 * 1000;
const profileDataStaleTimeMs = 5 * 60 * 1000;

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30 * 1000,
      },
    },
  });

  queryClient.setQueryDefaults(queryKeys.homeToday(), {
    staleTime: dailyDataStaleTimeMs,
  });
  queryClient.setQueryDefaults(queryKeys.behaviorProfileMe(), {
    staleTime: profileDataStaleTimeMs,
  });
  queryClient.setQueryDefaults(queryKeys.focusSessionsToday(), {
    staleTime: liveDataStaleTimeMs,
  });
  queryClient.setQueryDefaults(queryKeys.studyRooms(), {
    staleTime: dailyDataStaleTimeMs,
  });
  queryClient.setQueryDefaults(queryKeys.studyRoomMyParticipations(), {
    staleTime: dailyDataStaleTimeMs,
  });
  queryClient.setQueryDefaults(["focus-statistics"], {
    staleTime: profileDataStaleTimeMs,
  });

  return queryClient;
}

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

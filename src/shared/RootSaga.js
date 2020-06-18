import { all } from 'redux-saga/effects';
import { fetchDataWatches } from 'app/redux/FetchDataSaga';
import { sharedWatches } from 'app/redux/SagaShared';
import { marketWatches } from 'app/redux/MarketSaga';
import { userWatches } from 'app/redux/UserSaga';
import { authWatches } from 'app/redux/AuthSaga';
import { transactionWatches } from 'app/redux/TransactionSaga';
import { watchPollingTasks } from 'app/redux/PollingSaga';


export default function* rootSaga() {
    yield all([
        ...userWatches, // keep first to remove keys early when a page change happens
        ...fetchDataWatches,
        ...sharedWatches,
        ...authWatches,
		...marketWatches,
        ...transactionWatches,
        watchPollingTasks(),
    ]);
}

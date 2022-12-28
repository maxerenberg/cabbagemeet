import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { commonSetupsAndTeardowns, renderWithProviders } from 'test-utils';
import { setToday } from 'utils/dates.utils';
import DayPicker from './DayPicker';

commonSetupsAndTeardowns();

test('renders the calendar', async () => {
  setToday(new Date('2022-12-27T12:30:00-05:00'));

  const { container, getByText, queryByText } = renderWithProviders(<DayPicker />);

  expect(getByText(/On which days would you like to meet\?/)).toBeInTheDocument();
  expect(getByText('27')).toHaveClass('selected');

  await userEvent.click(getByText('28'));
  await waitFor(() => expect(getByText('28')).toHaveClass('selected'));

  await userEvent.click(getByText('28'));
  await waitFor(() => expect(getByText('28')).not.toHaveClass('selected'));

  const arrows = container.querySelectorAll('svg.arrow');
  expect(arrows).toHaveLength(2);
  const [leftArrow, rightArrow] = arrows;
  expect(leftArrow).toHaveClass('invisible');
  expect(rightArrow).not.toHaveClass('invisible');

  // December 22 should not be shown
  expect(queryByText('22')).toBeNull();
  await userEvent.click(rightArrow);
  // January 22 should be shown
  await waitFor(() => expect(getByText('22')).toBeInTheDocument());
  expect(leftArrow).not.toHaveClass('invisible');
});

test('renders the meeting form', async () => {
  const { getAllByText, getByText, getByPlaceholderText } = renderWithProviders(<DayPicker />);

  // There'll be one button for wide screens and another for small screens
  const letsMeetButtons = getAllByText("Let's meet");
  expect(letsMeetButtons.length).toBeGreaterThanOrEqual(1);
  await userEvent.click(letsMeetButtons[0]);
  await waitFor(() => getByPlaceholderText('Name your meeting'));

  await userEvent.click(getByText('9 am'));
  // There'll be two time pickers, one for each of start and end time
  expect(getAllByText('09').length).toBeGreaterThanOrEqual(1);
  expect(getAllByText('09')[0]).toHaveClass('selected');
  await userEvent.click(getAllByText('08')[0]);
  expect(getAllByText('08')[0]).toHaveClass('selected');
  expect(getAllByText('09')[0]).not.toHaveClass('selected');
  expect(getByText('8 am')).toBeInTheDocument();
});

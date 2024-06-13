// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// imports
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
// import {VRFCoordinatorV2_5} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFCoordinatorV2_5.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
// for automation in the contract
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__transactionFailed();
error Raffle__notEnoughETHEntered();
error Raffle__notOwner();
error Raffle__notOpen();
error Raffle__upkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A decentarlised Lottery contract
 * @author Uday Singh
 * @notice this contract enables the user to enter the lottery, the winner is chosen with the help of chainlink * * @notice VRF V2.5, and chainlink keepers for automation.
 */

contract Raffle is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
   event RaffleEnter(address indexed player);
   event RaffleRequestId(uint256 indexed winner);
   event winnerPicked(address indexed winner);

   // enum
   enum RaffleState {
      OPEN,
      CALCULATING
   }

   // STATE VARIABLES
   uint256 private immutable i_entranceFee;
   address payable[] private s_players;
   // request random numbers parameter decleration.
   bytes32 private immutable i_gasLane;
   uint256 private immutable i_subscriptionId;
   uint16 private constant MIN_REQUEST_CONFIRMATIONS = 3;
   uint32 private immutable i_callbackGasLimit;
   uint32 private constant NUM_WORDS = 1;
   uint256 private s_lastTimeStamp;
   string private constant AUTHOR = "Uday Singh";
   address private immutable i_owner;
   /** Lottery Winners */
   address private s_recentWinner;
   // bool private s_isOpen; // set to true if open state. but we can have mutltiple states in contracts so we use enums.
   RaffleState private s_raffleState;
   uint256 private immutable i_interval;

   constructor(
      address _vrfCoordinator, // vrf v2.5 contract address.
      uint256 entranceFee,
      bytes32 gasLane,
      uint256 susbscriptionId,
      uint32 callbackGasLimit,
      uint256 interval
   ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
      i_entranceFee = entranceFee;
      // i_VRFCordinator = VRFCoordinatorV2Interface(VRFCordinatorV2);
      i_gasLane = gasLane;
      i_subscriptionId = susbscriptionId;
      i_callbackGasLimit = callbackGasLimit;
      s_raffleState = RaffleState.OPEN;
      s_lastTimeStamp = block.timestamp;
      i_interval = interval;
      i_owner = msg.sender;
   }

   modifier OnlyOwner() {
      if (msg.sender != i_owner) revert Raffle__notOwner();
      _;
   }

   function enterRaffle() public payable {
      if (msg.value < i_entranceFee) revert Raffle__notEnoughETHEntered();
      if (s_raffleState != RaffleState.OPEN) revert Raffle__notOpen();

      s_players.push(payable(msg.sender));
      emit RaffleEnter(msg.sender);
   }

   /**
    * @dev checkUpkeep called by keepers ofchain
    */

   function checkUpkeep(
      bytes calldata /* checkData */
   ) external view override returns (bool upkeepNeeded, bytes memory performData) {
      bool isOpen = (RaffleState.OPEN == s_raffleState);
      bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
      bool hasPlayers = (s_players.length > 0);
      bool hasBalance = (address(this).balance > 0);

      upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
      performData = ("0x");
   }

   function myCheckUpKeep() public view returns (bool upKeepNeeded) {
      bool isOpen = (RaffleState.OPEN == s_raffleState);
      bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
      bool hasPlayers = (s_players.length > 0);
      bool hasBalance = (address(this).balance > 0);

      upKeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
   }

   function performUpkeep(bytes calldata /* performData */) external override /*returns ()*/ {
      bool upKeepNeeded = myCheckUpKeep();

      if (!upKeepNeeded) {
         revert Raffle__upkeepNotNeeded(
            address(this).balance,
            s_players.length,
            uint256(s_raffleState)
         );
      }

      uint256 requestID = s_vrfCoordinator.requestRandomWords(
         VRFV2PlusClient.RandomWordsRequest({
            keyHash: i_gasLane,
            subId: i_subscriptionId,
            requestConfirmations: MIN_REQUEST_CONFIRMATIONS,
            callbackGasLimit: i_callbackGasLimit,
            numWords: NUM_WORDS,
            extraArgs: VRFV2PlusClient._argsToBytes(
               VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
            ) // new parameter
         })
      );

      s_raffleState = RaffleState.CALCULATING;

      emit RaffleRequestId(requestID);
   }

   function fulfillRandomWords(
      uint256 /* requestId */,
      uint256[] calldata _randomWords
   ) internal override /*returns ()*/ {
      uint256 indexOfWinner = _randomWords[0] % s_players.length;
      address payable recentWinner = s_players[indexOfWinner];
      s_recentWinner = recentWinner;

      s_raffleState = RaffleState.OPEN;
      s_players = new address payable[](0);
      s_lastTimeStamp = block.timestamp;

      // sending the money to the winner.
      (bool success, ) = recentWinner.call{value: address(this).balance}("");

      if (!success) revert Raffle__transactionFailed();
      emit winnerPicked(recentWinner);
   }

   function resetRaffleState() public OnlyOwner {
      s_raffleState = RaffleState.OPEN;
      s_players = new address payable[](0);
      s_lastTimeStamp = block.timestamp;
   }

   function getEntranceFee() public view returns (uint256) {
      return i_entranceFee;
   }

   function getPlayer(uint256 index) public view returns (address) {
      return s_players[index];
   }

   function getRecentWinner() public view returns (address) {
      return s_recentWinner;
   }

   function getRaffleState() public view returns (RaffleState) {
      return s_raffleState;
   }

   function getNumWords() public pure returns (uint256) {
      return NUM_WORDS;
   }

   function getNumberOfPlayers() public view returns (uint256) {
      return s_players.length;
   }

   function getLastTimeStamp() public view returns (uint256) {
      return s_lastTimeStamp;
   }

   function getRequestConfimations() public pure returns (uint256) {
      return MIN_REQUEST_CONFIRMATIONS;
   }

   function getInterval() public view returns (uint256) {
      return i_interval;
   }

   function getAuthor() public pure returns (string memory) {
      return AUTHOR;
   }
}

pragma solidity 0.5.16;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "./interfaces/IGTRXCertifiableToken.sol";


contract GTRXPromoFund is Initializable {
    using SafeMath for uint;

    IGTRXCertifiableToken private GTRXToken;
    address public authorizor;
    address public releaser;

    uint public totalGTRXAuthorized;
    uint public totalGTRXReleased;

    uint public totalEthAuthorized;
    uint public totalEthReleased;

    function initialize(
        address _authorizor,
        address _releaser,
        IGTRXCertifiableToken _GTRXToken
    ) external initializer {
        GTRXToken = _GTRXToken;
        authorizor = _authorizor;
        releaser = _releaser;
    }

    function() external payable { }

    function releaseGTRXToAddress(address receiver, uint amount) external returns(uint) {
        require(msg.sender == releaser, "Can only be called releaser.");
        require(amount <= totalGTRXAuthorized.sub(totalGTRXReleased), "Cannot release more GTRX than available.");
        totalGTRXReleased = totalGTRXReleased.add(amount);
        GTRXToken.transfer(receiver, amount);
    }

    function authorizeGTRX(uint amount) external returns (uint) {
        require(msg.sender == authorizor, "Can only be called authorizor.");
        totalGTRXAuthorized = totalGTRXAuthorized.add(amount);
    }

    function releaseEthToAddress(address receiver, uint amount) external returns(uint) {
        require(msg.sender == releaser, "Can only be called releaser.");
        require(amount <= totalEthAuthorized.sub(totalEthReleased), "Cannot release more Eth than available.");
        totalEthReleased = totalEthReleased.add(amount);
        GTRXToken.transfer(receiver, amount);
    }

    function authorizeEth(uint amount) external returns (uint) {
        require(msg.sender == authorizor, "Can only be called authorizor.");
        totalEthAuthorized = totalEthAuthorized.add(amount);
    }
}
